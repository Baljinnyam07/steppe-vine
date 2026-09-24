import WineMainBoard from './WineMainBoard'
import StoryPanel from './ui/StoryPanel'
import OrderModal from './ui/OrderModal'
import SvgDefs from './ui/SvgDefs'

export default function App() {
  return (
    <>
      <SvgDefs />
      <WineMainBoard />
      {/* detail view + modal sit above the board overlay */}
      <div className="ui">
        <StoryPanel />
        <OrderModal />
      </div>
    </>
  )
}
