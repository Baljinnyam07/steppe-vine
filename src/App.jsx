import WineMainBoard from './WineMainBoard'
import StoryPanel from './ui/StoryPanel'
import SvgDefs from './ui/SvgDefs'
import OrderModal from './ui/OrderModal'
import Loader from './ui/Loader'
import { useEffect } from 'react'
import { initTracking } from './lib/track'

export default function App() {
  useEffect(() => { initTracking() }, [])
  return (
    <>
      <SvgDefs />
      <Loader />
      <WineMainBoard />
      {/* detail view + modal sit above the board overlay */}
      <div className="ui">
        <StoryPanel />
        <OrderModal />
      </div>
    </>
  )
}
