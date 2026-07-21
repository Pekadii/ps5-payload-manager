import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/helpers'

export default function LauncherRecovery() {
  const { t } = useTranslation()

  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setError('')

    const response = await fetch('/launcher_status', {
      cache: 'no-store'
    })

    let result

    try {
      result = await response.json()
    } catch {
      throw new Error(
        `Launcher status request failed (${response.status})`
      )
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
        `Launcher status request failed (${response.status})`
      )
    }

    setStatus(result)
    return result
  }, [])

  useEffect(() => {
    refresh().catch(error => setError(error.message))
  }, [refresh])

  const repair = async () => {
    setBusy('repair')
    setMessage('')
    setError('')

    try {
      const response = await fetch('/launcher_repair', {
        method: 'POST'
      })

      let result

      try {
        result = await response.json()
      } catch {
        throw new Error(
          `Launcher repair failed (${response.status})`
        )
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
      1    `Launcher repair failed (${response.status})`
        )
      }

      setMessage(
        result?.message || 'Launcher repair completed successfully.'
      )

     sessionStorage.removeItem('launcher-recovery-warning-shown')

      await refresh()
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy('')
    }
  }

  const verify = async () => {
    setBusy('verify')
    setMessage('')
    setError('')

    try {
      const result = await refresh()

      const verified =
        result?.files_ready === true &&
        result?.param_json === true &&
        result?.icon0_png === true

      setMessage(
        verified
          ? 'Launcher verification complete. No repair is needed.'
          : 'Launcher verification complete. Repair is recommended.'
      )
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy('')
    }
  }

  const loading = status === null && !error

  const ready =
    status?.files_ready === true &&
    status?.param_json === true &&
    status?.icon0_png === true

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={cn(
              'shrink-0 rounded-2xl p-3',
              ready
                ? 'bg-emerald-400/10 text-emerald-300'
                : 'bg-amber-400/10 text-amber-300'
            )}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : ready ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-base font-bold uppercase tracking-tight text-white md:text-lg">
              {t('launcher_recovery.title', 'Launcher Recovery')}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              {t(
                'launcher_recovery.description',
                'Verify and repair the Payload Manager Home Screen shortcut.'
              )}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider',
            loading
              ? 'border-white/10 bg-white/5 text-zinc-400'
              : ready
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
          )}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : ready ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}

          {loading
            ? t('launcher_recovery.checking', 'Checking')
            : ready
              ? t('launcher_recovery.ready', 'Ready')
              : t(
                  'launcher_recovery.repair_needed',
                  'Repair Needed'
                )}
        </div>
      </div>

      <div className="space-y-5 border-t border-white/10 p-5 md:p-8">
        {(message || error) && (
          <div
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold',
              error
                ? 'border-red-400/20 bg-red-400/10 text-red-200'
                : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
            )}
          >
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={verify}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black uppercase tracking-tight text-white transition-all hover:border-ps-blue/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'verify' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}

            {busy === 'verify'
              ? t('launcher_recovery.verifying', 'Verifying')
              : t('launcher_recovery.verify', 'Verify')}
          </button>

          <button
            type="button"
            onClick={repair}
            disabled={Boolean(busy) || ready}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ps-blue px-5 py-4 font-black uppercase tracking-tight text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'repair' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wrench className="h-5 w-5" />
            )}

            {busy === 'repair'
              ? t('launcher_recovery.repairing', 'Repairing')
              : t('launcher_recovery.repair', 'Repair')}
          </button>
        </div>
      </div>
    </div>
  )
}
