import { BagCollection } from '@/components/BagCollection'
import { CharmBuilder } from '@/components/CharmBuilder'
import { HeroBanner } from '@/components/HeroBanner'
import { SocialGallery } from '@/components/SocialGallery'
import { bagCollection, charmBuilder, heroVideos, socialGallery } from '@/content/home'

export function HomePage() {
  return (
    <>
      <HeroBanner desktop={heroVideos.desktop} mobile={heroVideos.mobile} />
      {/* Hidden for now — restore with: import { ConstellationDivider } from '@/components/ConstellationDivider' */}
      {/* <ConstellationDivider /> */}
      <BagCollection {...bagCollection} />
      <SocialGallery {...socialGallery} />
      <CharmBuilder {...charmBuilder} />
    </>
  )
}
