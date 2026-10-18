import { VisitQuiz } from './VisitQuiz'
import { uniqueElements } from './visit-navigation'
import { exhibitionCopy as ui } from './exhibition-copy'

import { Link, useSearchParams } from 'react-router-dom'
import { useTour } from './exhibition-data'
import { Arrow, Status } from './exhibition-ui'

export function VisitPreparation() {
  const tour = useTour()
  const [params, setParams] = useSearchParams()
  const requestedRoom = params.get('room')
  const roomKey = tour.data?.rooms.some(item => item.key === requestedRoom) ? requestedRoom : tour.data?.rooms[1]?.key || tour.data?.rooms[0]?.key || ''
  const room = tour.data?.rooms.find(item => item.key === roomKey)
  const elements = uniqueElements(room?.points.flatMap(point => point.elements) || [])
  return <section className="visit-page page-shell"><div className="breadcrumb"><Link to="/">{ui.discover}</Link><span>/</span><span>{ui.virtualVisit}</span></div><header className="visit-heading"><p className="eyebrow">{ui.visitAtOwnPace}</p><h1>{ui.enter}<br/><em>{ui.choosePath}</em></h1><div><p>{ui.visitIntro}</p><Link className="pill primary visit-3d-link" to="/recorrido">{ui.enterTour} <Arrow/></Link><a className="pill primary visit-text-link" href="#visit-rooms">{ui.exploreRooms} <span aria-hidden="true">↓</span></a><p className="small-copy">{ui.desktopRequirement}</p></div></header><Status {...tour}/>
    {tour.data && <div className="visit-layout" id="visit-rooms" tabIndex={-1}><nav className="room-nav" aria-label={ui.museumRooms}>{tour.data.rooms.map((item, index) => <button className={item.key === roomKey ? 'current' : ''} key={item.key} aria-current={item.key === roomKey ? 'true' : undefined} onClick={() => setParams({ room: item.key })}><span>{String(index + 1).padStart(2, '0')}</span>{item.name}<span aria-hidden="true">↗</span></button>)}</nav><section className="room-content" aria-labelledby="room-title"><p className="eyebrow">{ui.textTour}</p><h2 id="room-title">{room?.name || ui.selectRoom}</h2>{room && <>{room.short_description && <p>{room.short_description}</p>}<p>{elements.length} fichas en esta sala</p><div className="room-pieces">{elements.map(item => <Link key={item.slug} to={`/elementos/${item.slug}`}><span>{item.title}</span><Arrow/></Link>)}</div>{!elements.length && <p>{room.key === 'room.hearth' ? ui.hearthGuide : ui.emptyRoom}</p>}</>}</section></div>}
    {tour.data && <VisitQuiz/>}
  </section>
}
