import { create } from 'zustand'
import { mergeStates } from '../lib/backup'
import {
  createDefaultState,
  idbStore,
  loadState,
  saveState,
  type KeyValueStore,
  type RatingContext,
  type RatingTarget,
  type Score,
  type UserState,
} from '../lib/storage'

interface UserStore {
  state: UserState
  ready: boolean
  /** 最近一次写入是否失败（例如浏览器禁止存储） */
  saveFailed: boolean
  init: (store?: KeyValueStore) => Promise<void>
  rate: (target: RatingTarget, id: string, score: Score, context: RatingContext) => void
  toggleFavorite: (artworkId: string) => void
  setNote: (styleId: string, text: string) => void
  visitStyle: (styleId: string) => void
  setTourPosition: (family: string, style?: string) => void
  savePrompt: (subject: string, text: string) => void
  toggleExercise: (styleId: string) => void
  updateSettings: (settings: Partial<UserState['settings']>) => void
  replaceState: (next: UserState) => void
  mergeIn: (incoming: UserState) => void
  reset: () => void
  markBackedUp: () => void
  flush: () => Promise<void>
}

let backend: KeyValueStore = idbStore
let timer: ReturnType<typeof setTimeout> | undefined
const SAVE_DELAY_MS = 500

export const useUserStore = create<UserStore>((setStore, getStore) => {
  const update = (fn: (s: UserState) => UserState) => {
    setStore({ state: fn(getStore().state) })
    scheduleSave()
  }

  const scheduleSave = () => {
    if (!getStore().ready) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void getStore().flush(), SAVE_DELAY_MS)
  }

  const now = () => new Date().toISOString()

  return {
    state: createDefaultState(),
    ready: false,
    saveFailed: false,

    init: async (store) => {
      if (store) backend = store
      const state = await loadState(backend)
      setStore({ state, ready: true })
    },

    rate: (target, id, score, context) =>
      update((s) => ({ ...s, ratings: [...s.ratings, { target, id, score, context, at: now() }] })),

    toggleFavorite: (artworkId) =>
      update((s) => ({
        ...s,
        favorites: s.favorites.includes(artworkId)
          ? s.favorites.filter((id) => id !== artworkId)
          : [...s.favorites, artworkId],
      })),

    setNote: (styleId, text) =>
      update((s) => {
        const notes = { ...s.notes }
        if (text.trim()) notes[styleId] = text
        else delete notes[styleId]
        return { ...s, notes }
      }),

    visitStyle: (styleId) =>
      update((s) =>
        s.progress.visitedStyles.includes(styleId)
          ? s
          : { ...s, progress: { ...s.progress, visitedStyles: [...s.progress.visitedStyles, styleId] } },
      ),

    setTourPosition: (family, style) =>
      update((s) => ({ ...s, progress: { ...s.progress, tour: { family, style } } })),

    savePrompt: (subject, text) =>
      update((s) => ({ ...s, prompts: [...s.prompts, { subject, text, at: now() }] })),

    toggleExercise: (styleId) =>
      update((s) => ({
        ...s,
        exercisesDone: s.exercisesDone.includes(styleId)
          ? s.exercisesDone.filter((id) => id !== styleId)
          : [...s.exercisesDone, styleId],
      })),

    updateSettings: (settings) => update((s) => ({ ...s, settings: { ...s.settings, ...settings } })),

    replaceState: (next) => update(() => next),

    mergeIn: (incoming) => update((s) => mergeStates(s, incoming)),

    reset: () => update(() => createDefaultState()),

    markBackedUp: () => update((s) => ({ ...s, lastBackupAt: now() })),

    flush: async () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      const ok = await saveState(backend, getStore().state)
      setStore({ saveFailed: !ok })
    },
  }
})

/** 页面隐藏时立刻写入，避免最后几次评分丢失 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && useUserStore.getState().ready) void useUserStore.getState().flush()
  })
}
