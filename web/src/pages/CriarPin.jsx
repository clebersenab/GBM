import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { AuthShell, FormError, Submit } from '../ui'
import PinInput from '../PinInput'

export default function CriarPin() {
  const { refresh } = useSession()
  const nav = useNavigate()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (pin.length !== 4) return setError('O PIN tem 4 números.')
    if (pin !== confirm) return setError('Os dois PINs não são iguais.')
    setBusy(true); setError(null)
    try {
      await api('/parent/pin', { method: 'POST', body: { pin } })
      await refresh()
      nav('/perfis', { replace: true })
    } catch (err) {
      setError(err.status === 403 ? 'Por segurança, entre de novo para criar o PIN.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Crie o PIN dos pais"
      subtitle="São 4 números que só os adultos sabem. Ele protege a criação de perfis e as compras das mãos curiosas.">
      <form onSubmit={submit} className="stack">
        <PinInput label="PIN" value={pin} onChange={setPin} autoFocus />
        <PinInput label="Repita o PIN" value={confirm} onChange={setConfirm} />
        <FormError error={error} />
        <Submit busy={busy}>Salvar PIN</Submit>
      </form>
    </AuthShell>
  )
}
