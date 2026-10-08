import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import type { CatalogItem } from './contracts'
import { copy } from './interface-copy'

export function ElementCard({ item }: { item: CatalogItem }) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const imageAvailable = !!item.thumbnail_resource_id && failedImage !== item.thumbnail_resource_id
  return <Link className="card" to={'/elementos/' + encodeURIComponent(item.slug)}>
    <div className={'card-visual' + (imageAvailable ? ' has-image' : '')}>
      {imageAvailable ? <img src={api.resourceUrl(item.slug, item.thumbnail_resource_id!)} alt="" loading="lazy" width="400" height="280" onError={() => setFailedImage(item.thumbnail_resource_id!)} /> : <>
        <span className="visual-type" aria-hidden="true">{item.has_3d_model ? '3D' : 'Aa'}</span>
        <span className="visual-caption">{item.has_3d_model ? copy.common.noPhoto : copy.common.textRecord}</span>
      </>}
      <div className="resource-badges">{item.has_3d_model && <span>{copy.common.model}</span>}{item.has_narration && <span>{copy.common.narration}</span>}</div>
    </div>
    <div className="card-copy"><span className="section-num">{item.category?.name || copy.common.textRecord}</span><h2>{item.title}</h2>
      {item.community && <p className="card-community">{item.community}</p>}<p className="card-description">{item.description}</p>
      <span className="card-link">{copy.common.openDetail} <span aria-hidden="true">→</span></span>
    </div>
  </Link>
}
