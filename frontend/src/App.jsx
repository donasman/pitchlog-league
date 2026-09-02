/**
 * App 루트 — RouterProvider 래핑
 * React.lazy로 페이지 단위 지연 로딩 적용
 */

import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

function PageFallback() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <LoadingSkeleton rows={6} />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
