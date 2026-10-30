import { useEffect, useRef, useState, type FormEvent } from 'react'
import PhoneInput from 'react-phone-number-input/input'
import { getCountries, getCountryCallingCode, isPossiblePhoneNumber, parsePhoneNumber, type Country, type Value } from 'react-phone-number-input'
import { browserCountry } from './browserCountry'
import styles from './CheckoutModal.module.css'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries().sort((a, b) => (countryNames.of(a) ?? a).localeCompare(countryNames.of(b) ?? b))

type CheckoutModalProps = {
  onClose: () => void
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  /** Email the shopper left, shown back to them in the sold-out message */
  const [sentTo, setSentTo] = useState('')
  const submitting = useRef(false)
  const successRef = useRef<HTMLDivElement>(null)
  const [country, setCountry] = useState<Country>(browserCountry)
  const [phone, setPhone] = useState<Value>()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    nameRef.current?.focus({ preventScroll: true })
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    if (sent) successRef.current?.focus({ preventScroll: true })
  }, [sent])

  const dismiss = () => {
    dialogRef.current?.close()
    onClose()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting.current) return
    if (phone && !isPossiblePhoneNumber(phone)) {
      setNotice('Please check your phone number, or leave it blank.')
      return
    }
    const data = new FormData(event.currentTarget)
    const lead = {
      fullName: String(data.get('fullName') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      phone: phone ?? '',
      country,
    }
    submitting.current = true
    setSending(true)
    setNotice('')
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(20000),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || result.ok !== true) {
        setNotice(result.error || 'We couldn’t send your request. Please try again.')
        return
      }
      setSentTo(lead.email)
      setSent(true)
    } catch {
      setNotice('We couldn’t confirm your request. Please check your connection and try again.')
    } finally {
      submitting.current = false
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby="checkout-title"
      aria-describedby="checkout-description"
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss()
      }}
    >
      <header className={styles.header}>
        <Constellation />
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close checkout">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {!sent && <span className={styles.emblem} aria-hidden="true">✧</span>}
        {sent ? (
          <>
            <span className={styles.soldBadge}>Sold out</span>
            <h2 id="checkout-title">Every star is taken.</h2>
            <p id="checkout-description">This first drop has sold out, but your place in line is saved.</p>
          </>
        ) : (
          <>
            <h2 id="checkout-title">Make it yours.</h2>
            <p id="checkout-description">Leave your details to take the next step.</p>
          </>
        )}
      </header>

      {sent ? (
        <div className={styles.success} ref={successRef} tabIndex={-1}>
          <span className={styles.successMark} aria-hidden="true">✧</span>
          <p role="status">You’re on the list.</p>
          <span>
            We’ll email you at <strong className={styles.sentTo}>{sentTo}</strong> the moment STELLÉ is back in stock,
            before anyone else hears about it.
          </span>
          <button type="button" className={styles.submit} onClick={dismiss}>Back to the site</button>
        </div>
      ) : (
      <form aria-busy={sending} autoComplete="off" className={styles.form} onSubmit={submit} onChange={() => setNotice('')}>
        <label className={styles.field}>
          <span>Full name <span className={styles.required} aria-hidden="true">*</span></span>
          <input
            disabled={sending}
            ref={nameRef}
            name="fullName"
            autoComplete="off"
            placeholder="Your full name"
            required
            maxLength={120}
            onChange={(event) => event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? '' : 'Please enter your full name.')}
          />
        </label>

        <div className={styles.field}>
          <label htmlFor="checkout-phone">Phone number <span className={styles.optional}>(optional)</span></label>
          <div className={styles.phone}>
            <select
              disabled={sending}
              name="countryCode"
              aria-label="Country calling code"
              autoComplete="off"
              value={country}
              onChange={(event) => {
                const nextCountry = event.target.value as Country
                const nationalNumber = phone ? parsePhoneNumber(phone)?.nationalNumber : undefined
                setCountry(nextCountry)
                if (nationalNumber) setPhone(`+${getCountryCallingCode(nextCountry)}${nationalNumber}` as Value)
                setNotice('')
              }}
            >
              {countries.map((region) => (
                <option key={region} value={region}>
                  {region === country ? `${region} +${getCountryCallingCode(region)}` : `${countryNames.of(region)} (+${getCountryCallingCode(region)})`}
                </option>
              ))}
            </select>
            <PhoneInput
              disabled={sending}
              id="checkout-phone"
              name="phone"
              autoComplete="off"
              defaultCountry={country}
              value={phone}
              onChange={(value) => {
                setPhone(value)
                const detectedCountry = value ? parsePhoneNumber(value)?.country : undefined
                if (detectedCountry) setCountry(detectedCountry)
                setNotice('')
              }}
              placeholder="Phone number"
              maxLength={30}
            />
          </div>
        </div>

        <label className={styles.field}>
          <span>Email <span className={styles.required} aria-hidden="true">*</span></span>
          <input disabled={sending} name="email" type="email" autoComplete="off" placeholder="you@example.com" required maxLength={254} />
        </label>

        <p className={styles.consent}>
          By submitting, you agree to receive emails and marketing updates from STELLÉ. You can unsubscribe at any time.
        </p>

        <button type="submit" disabled={sending} className={styles.submit}>{sending ? 'Sending…' : 'Submit'} <span aria-hidden="true">✧</span></button>
        {notice && <p className={styles.notice} role="alert">{notice}</p>}
        <button type="button" className={styles.back} onClick={dismiss}>Back to your bag</button>
      </form>
      )}
    </dialog>
  )
}

function Constellation() {
  return (
    <svg className={styles.constellation} viewBox="0 0 200 180" fill="none" aria-hidden="true">
      <path d="m20 130 55-30 35-65 55 30-25 70-65-35" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="75" cy="100" r="3" fill="currentColor" />
      <circle cx="110" cy="35" r="2" fill="currentColor" />
      <circle cx="165" cy="65" r="2" fill="currentColor" />
      <circle cx="140" cy="135" r="2" fill="currentColor" />
      <path d="m20 122 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM164 53l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="currentColor" />
      <circle cx="50" cy="35" r="1" fill="currentColor" />
      <circle cx="185" cy="115" r="1" fill="currentColor" />
    </svg>
  )
}
