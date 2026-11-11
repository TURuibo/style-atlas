import { useParams } from 'react-router'
import { Page, Section } from '../../components/ui'
import { content, eras, erasOfStyle, stylesOfRegion } from '../../content'
import { NotFound } from '../NotFound'
import { StyleRow } from './ExplorePage'

export function RegionPage() {
  const { regionId = '' } = useParams()
  const name = content.vocab.regions[regionId]
  if (!name) return <NotFound />
  const styles = stylesOfRegion(regionId)
  return (
    <Page back kicker="地域" title={name}>
      <Section title={`${styles.length} 种风格`} aside={<span className="text-xs text-muted">按年代</span>}>
        {styles.length === 0 ? (
          <p className="text-sm text-muted">这个地区的风格还在准备。</p>
        ) : (
          styles.map((s) => <StyleRow key={s.id} style={s} />)
        )}
      </Section>
    </Page>
  )
}

export function EraPage() {
  const { eraId = '' } = useParams()
  const era = eras.find((e) => e.id === eraId)
  if (!era) return <NotFound />
  const styles = content.styles
    .filter((s) => erasOfStyle(s).some((e) => e.id === era.id))
    .sort((a, b) => a.era.start - b.era.start)
  return (
    <Page back kicker="年代" title={era.zh}>
      <Section title={`${styles.length} 种风格`} aside={<span className="text-xs text-muted">按开始年份</span>}>
        {styles.length === 0 ? (
          <p className="text-sm text-muted">这个时代的风格还在准备。</p>
        ) : (
          styles.map((s) => <StyleRow key={s.id} style={s} />)
        )}
      </Section>
    </Page>
  )
}
