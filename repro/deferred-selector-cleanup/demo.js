async function reproduce() {
  const [{ createElement: h }, { flushSync }, { createRoot }, slate, slateReact] =
    await Promise.all([
      import('react'),
      import('react-dom'),
      import('react-dom/client'),
      import('slate'),
      import('slate-react'),
    ])
  const { createEditor, Transforms } = slate
  const { Editable, Slate, useSlateSelector, withReact } = slateReact

  const editor = withReact(createEditor())
  const root = createRoot(document.getElementById('editor'))
  const initialValue = [{ children: [{ text: 'test' }] }]
  const buttons = ['queue', 'unmount', 'flush'].map(id =>
    document.getElementById(id)
  )
  const result = document.getElementById('result')
  let activeCalls = 0
  let removedCalls = 0
  const activeSelector = () => {
    activeCalls++
    return false
  }
  const removedSelector = () => {
    removedCalls++
    return false
  }

  function DeferredSelector({ selector }) {
    useSlateSelector(selector, undefined, { deferred: true })
    return null
  }

  function render(showRemoved, showEditable) {
    flushSync(() => {
      root.render(h(Slate, { editor, initialValue },
        h(DeferredSelector, { selector: activeSelector }),
        showRemoved && h(DeferredSelector, { selector: removedSelector }),
        showEditable && h(Editable)
      ))
    })
  }

  function report(message) {
    result.textContent = [
      message,
      '',
      'Selector calls after initial mount',
      `Still mounted: ${activeCalls}`,
      `Unmounted:     ${removedCalls} (expected 0)`,
    ].join('\n')
  }

  render(true, false)
  activeCalls = 0
  removedCalls = 0
  report('Ready')
  buttons[0].disabled = false

  buttons[0].onclick = async () => {
    Transforms.insertText(editor, '!', { at: { path: [0, 0], offset: 4 } })
    await Promise.resolve()
    report('Editor changed. Both selector updates are queued.')
    buttons[0].disabled = true
    buttons[1].disabled = false
  }
  buttons[1].onclick = () => {
    render(false, false)
    report('One selector unmounted before Editable renders.')
    buttons[1].disabled = true
    buttons[2].disabled = false
  }
  buttons[2].onclick = () => {
    render(false, true)
    report(removedCalls ? 'BUG: The unmounted selector still ran.' : 'Only the mounted selector ran.')
    buttons[2].disabled = true
  }
}

reproduce().catch(error => {
  document.getElementById('result').textContent = String(error)
  console.error(error)
})
