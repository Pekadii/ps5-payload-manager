import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Image,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../utils/helpers'

const StatusBadge = ({ ready, loading, text }) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider',
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

    {text}
  </span>
)

const FileStatus = ({ icon: Icon, name, ready }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          'rounded-xl p-2.5',
          ready
            ? 'bg-emerald-400/10 text-emerald-300'
            : 'bg-amber-400/10 text-amber-300'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <span className="truncate font-bold text-white">{name}</span>
    </div>

    <span
      className={cn(
        'shrink-0 text-xs font-black uppercase tracking-wider',
        ready ? 'text-emerald-300' : 'text-amber-300'
      )}
    >
      {ready ? 'Ready' : 'Needs repair'}
    </span>
  </div>
)

export default function LauncherManager() {
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

    let result = null

    try {
      result = await response.json()
    } catch {
      throw new Error(`Launcher status request failed (${response.status})`)
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
        `Launcher status request failed (${response.status})`
      )
    }

    setStatus(result)
  }, [])

  useEffect(() => {
    refresh().catch(error => setError(error.message))
  }, [refresh])

  const runAction = async action => {
    setBusy(action)
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/launcher_${action}`, {
        method: 'POST'
      })

      let result = null

      try {
        result = await response.json()
      } catch {
        throw new Error(`Launcher ${action} failed (${response.status})`)
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
          `Launcher ${action} failed (${response.status})`
        )
      }

      setMessage(
        result?.message ||
        (action === 'repair'
          ? 'Launcher repair completed.'
          : 'Launcher reinstall completed.')
      )

      await refresh()
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy('')
    }
  }

  const loading = status === null && !error
  const ready =
    status?.status === 'ready' ||
    status?.files_ready === true

  const statusText = loading
    ? t('launcher.checking', 'Checking')
    : ready
      ? t('launcher.ready', 'Ready')
      : t('launcher.needs_attention', 'Needs attention')

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-col gap-5 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex min-w-0 items-start gap-4 md:items-center md:gap-6">
          <div className="shrink-0 rounded-2xl bg-ps-blue/10 p-3 md:p-4">
            <Wrench className="h-5 w-5 text-ps-blue md:h-6 md:w-6" />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-base font-bold uppercase leading-tight tracking-tight text-white md:text-lg">
              {t('launcher.title', 'Launcher Manager')}
            </p>

            <p className="text-sm leading-relaxed text-zinc-500">
              {t(
                'launcher.description',
                'Verify, repair, or reinstall the PLDM00001 PS5 home-screen launcher.'
              )}
            </p>
          </div>
        </div>

        <StatusBadge
          ready={ready}
          loading={loading}
          text={statusText}
        />
      </div>

      <div className="space-y-6 p-5 md:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FileStatus
            icon={FileJson}
            name="param.json"
            ready={status?.param_json === true}
          />

          <FileStatus
            icon={Image}
            name="icon0.png"
            ready={status?.icon0_png === true}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck
                className={cn(
                  'h-5 w-5',
                  status?.files_ready
                    ? 'text-emerald-300'
                    : 'text-zinc-500'
                )}
              />

              <p className="font-bold uppercase tracking-tight text-white">
                {t('launcher.files_title', 'Launcher Files')}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-zinc-500">
              {status?.files_ready
                ? t(
                    'launcher.files_verified',
                    'The launcher files are present and match the embedded version.'
                  )
                : t(
                    'launcher.files_unverified',
                    'One or more launcher files are missing or outdated.'
                  )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-zinc-500" />

              <p className="font-bold uppercase tracking-tight text-white">
                {t('launcher.registration_title', 'Shell Registration')}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-zinc-500">
              {status?.registration_note ||
                t(
                  'launcher.registration_unknown',
                  'PS5 shell registration cannot be confirmed directly. Repair will attempt to register the launcher again.'
                )}
            </p>

            {status?.registration && (
              <p className="mt-3 text-xs font-black uppercase tracking-wider text-zinc-400">
                {status.registration}
              </p>
            )}
          </div>
        </div>

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setMessage('')
              setError('')
              refresh().catch(error => setError(error.message))
            }}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black uppercase tracking-tight text-white transition-all hover:border-ps-blue/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                'h-5 w-5',
                loading && 'animate-spin'
              )}
            />

            {t('launcher.verify', 'Verify')}
          </button>

          <button
            type="button"
            onClick={() => runAction('repair')}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ps-blue px-5 py-4 font-black uppercase tracking-tight text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'repair' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Wrench className="h-5 w-5" />
            )}

            {busy === 'repair'
              ? t('launcher.repairing', 'Repairing')
              : t('launcher.repair', 'Repair')}
          </button>

          <button
            type="button"
            onClick={() => runAction('reinstall')}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 font-black uppercase tracking-tight text-red-200 transition-all hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'reinstall' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}

            {busy === 'reinstall'
              ? t('launcher.reinstalling', 'Reinstalling')
              : t('launcher.reinstall', 'Reinstall')}
          </button>
        </div>

        <p className="text-xs leading-relaxed text-zinc-600">
          {t(
            'launcher.reinstall_warning',
            'Reinstall removes and recreates the launcher files. Use Repair first unless the launcher remains missing or damaged.'
          )}
        </p>
      </div>
    </div>
  )
}
