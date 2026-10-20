import { HeroBanner } from '@/components/HeroBanner'
import { heroVideos } from '@/content/home'

export function HomePage() {
  return (
    <>
      <HeroBanner desktop={heroVideos.desktop} mobile={heroVideos.mobile} />
    </>
  )
}
