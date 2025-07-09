"use client"

import dynamic from 'next/dynamic'

const DeploymentUI = dynamic(() => import('./deployment-ui'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading S3 Gateway Deployment Interface...</div>
    </div>
  )
})

export default function Page() {
  return <DeploymentUI />
}