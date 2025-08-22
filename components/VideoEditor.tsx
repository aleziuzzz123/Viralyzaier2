// components/VideoEditor.tsx
import { useEffect } from 'react'
import { Edit, Canvas, Controls, Timeline } from '@shotstack/shotstack-studio'

// If you want your custom colors, uncomment next two lines and also the theme option below
// import { customEditorTheme } from '../themes/customEditorTheme'

export default function VideoEditor() {
  useEffect(() => {
    let canvas: Canvas | undefined
    let timeline: Timeline | undefined

    ;(async () => {
      // 1) Load a simple template from /public
      const res = await fetch('/templates/hello.json')
      if (!res.ok) throw new Error('Failed to fetch /templates/hello.json')
      const template = await res.json()

      // 2) Create the Edit (project) and init it
      const edit = new Edit(template.output.size, template.timeline.background)
      await edit.load()

      // 3) Create the preview Canvas (renders into [data-shotstack-studio])
      canvas = new Canvas(template.output.size, edit)
      await canvas.load()

      // 4) Load the template into the edit
      await edit.loadEdit(template)

      // 5) Keyboard controls (J/K/L, arrows, space, etc.)
      const controls = new Controls(edit)
      await controls.load()

      // 6) Timeline (renders into [data-shotstack-timeline])
      timeline = new Timeline(
        edit,
        { width: template.output.size.width, height: 300 }
        // , { theme: customEditorTheme } // ← enable to use your custom theme
      )
      await timeline.load()

      console.log('✅ Shotstack timeline loaded')
    })().catch(err => {
      console.error('Shotstack init error:', err)
    })

    return () => {
      try { timeline?.dispose?.() } catch {}
      try { canvas?.dispose?.() } catch {}
    }
  }, [])

  // The SDK discovers these by data-attribute
  return (
    <div className="flex flex-col gap-4">
      <div data-shotstack-studio className="w-full aspect-video rounded-xl bg-black" />
      <div data-shotstack-timeline className="w-full h-[300px] rounded-xl" />
    </div>
  )
}

