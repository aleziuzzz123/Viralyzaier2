// components/AssetLibrary.tsx
import React from 'react'
import VideoEditor from './VideoEditor'

export default function AssetLibrary() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left panel (keep it simple for now) */}
      <aside className="col-span-3 bg-gray-800/60 rounded-xl p-4 min-h-[600px]">
        <div className="text-sm text-gray-300 font-semibold mb-3">Asset Library</div>
        <input
          placeholder="Search for Video..."
          className="w-full rounded-lg bg-gray-900/80 border border-gray-700 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        />
        {/* your tabs (Video, Image, Music, Stickers, AI) can go here */}
      </aside>

      {/* Right: Preview + Timeline */}
      <section className="col-span-9 space-y-4">
        <VideoEditor />
      </section>
    </div>
  )
}
