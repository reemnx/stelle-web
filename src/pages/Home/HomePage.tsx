import { BagCollection } from '@/components/BagCollection'
import { CharmDrop } from '@/components/CharmDrop'
import { ConstellationDivider } from '@/components/ConstellationDivider'
import { HeroBanner } from '@/components/HeroBanner'
import { SocialGallery } from '@/components/SocialGallery'
import { bagCollection, charmDrop, heroVideos, socialGallery } from '@/content/home'

export function HomePage() {
  return (
    <>
      <HeroBanner desktop={heroVideos.desktop} mobile={heroVideos.mobile} />
      <ConstellationDivider />
      <BagCollection {...bagCollection} />
      <SocialGallery {...socialGallery} />
      <CharmDrop {...charmDrop} />
    </>
  )
}
