import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Location } from '../astronomy/types'
import { validateLocation, type LocationValidationErrors } from './location'
import { useLocations, type LocationInput } from './useLocations'

interface EditorState {
  location?: Location
}

function LocationEditor({ location, onClose, onSave }: { location?: Location; onClose: () => void; onSave: (value: LocationInput) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(location?.name ?? '')
  const [latitude, setLatitude] = useState(location ? String(location.latitude) : '')
  const [longitude, setLongitude] = useState(location ? String(location.longitude) : '')
  const [timezone, setTimezone] = useState(location?.timezone ?? '')
  const [elevation, setElevation] = useState(location?.elevationMeters === null || location?.elevationMeters === undefined ? '' : String(location.elevationMeters))
  const [errors, setErrors] = useState<LocationValidationErrors>({})

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const candidate = {
      id: location?.id ?? 'pending-location',
      name,
      latitude: latitude.trim() === '' ? Number.NaN : Number(latitude),
      longitude: longitude.trim() === '' ? Number.NaN : Number(longitude),
      timezone,
      elevationMeters: elevation.trim() === '' ? null : Number(elevation),
    }
    const result = validateLocation(candidate)
    if ('errors' in result) {
      setErrors(result.errors)
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const { id: _id, ...input } = result
    onSave(input)
    onClose()
  }

  const field = (id: keyof LocationValidationErrors, label: string, control: React.ReactNode) => <label className="location-field" htmlFor={`location-${id}`}>
    <span>{label}</span>
    {control}
    {errors[id] && <small id={`location-${id}-error`} role="alert">{errors[id]}</small>}
  </label>

  return <dialog ref={dialogRef} className="location-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="location-dialog-title">
    <form ref={formRef} method="dialog" onSubmit={submit} noValidate>
      <div className="dialog-heading"><div><span className="section-kicker">Manual offline station</span><h2 id="location-dialog-title">{location ? 'Edit location' : 'Add location'}</h2></div><button type="button" className="dialog-close" aria-label="Close location dialog" onClick={onClose}>×</button></div>
      <div className="location-form-grid">
        {field('name', 'Name', <input id="location-name" autoFocus required aria-required="true" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'location-name-error' : undefined} />)}
        {field('latitude', 'Latitude', <input id="location-latitude" inputMode="decimal" required aria-required="true" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="28.2916" aria-invalid={Boolean(errors.latitude)} aria-describedby={errors.latitude ? 'location-latitude-error' : undefined} />)}
        {field('longitude', 'Longitude', <input id="location-longitude" inputMode="decimal" required aria-required="true" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-16.6291" aria-invalid={Boolean(errors.longitude)} aria-describedby={errors.longitude ? 'location-longitude-error' : undefined} />)}
        {field('timezone', 'Timezone', <><input id="location-timezone" required aria-required="true" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Atlantic/Canary" aria-invalid={Boolean(errors.timezone)} aria-describedby={errors.timezone ? 'location-timezone-error location-timezone-help' : 'location-timezone-help'} /><em id="location-timezone-help">IANA name, for example Europe/Prague or America/New_York</em></>)}
        {field('elevation', 'Elevation · meters · optional', <input id="location-elevation" inputMode="decimal" value={elevation} onChange={(event) => setElevation(event.target.value)} placeholder="Optional" aria-invalid={Boolean(errors.elevation)} aria-describedby={errors.elevation ? 'location-elevation-error' : undefined} />)}
      </div>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">{location ? 'Save changes' : 'Add & select location'}</button></div>
    </form>
  </dialog>
}

function DeleteLocationDialog({ location, isLastLocation, onClose, onDelete }: { location: Location; isLastLocation: boolean; onClose: () => void; onDelete: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return <dialog ref={dialogRef} className="location-dialog confirm-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="delete-location-title">
    <div className="dialog-heading"><div><span className="section-kicker">Saved station</span><h2 id="delete-location-title">Delete {location.name}?</h2></div></div>
    <p>{isLastLocation ? 'This is the last saved station. Sun Center will restore and select the default Ústí nad Labem station.' : 'The location will be removed from this browser. If it is active, Sun Center will select the first remaining station.'}</p>
    <div className="dialog-actions"><button autoFocus type="button" onClick={onClose}>Cancel</button><button className="danger-action" type="button" onClick={() => { onDelete(); onClose() }}>Delete location</button></div>
  </dialog>
}

export function LocationSelector() {
  const { activeLocation, locations, selectLocation, addLocation, updateLocation, deleteLocation } = useLocations()
  const [open, setOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null)
  const selectorRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  const restoreTriggerFocus = () => requestAnimationFrame(() => triggerRef.current?.focus())
  const closeEditor = () => { setEditor(null); restoreTriggerFocus() }
  const closeConfirmation = () => { setConfirmDelete(null); restoreTriggerFocus() }

  return <div ref={selectorRef} className="location-selector" onKeyDown={(event) => { if (open && event.key === 'Escape') { setOpen(false); restoreTriggerFocus() } }}>
    <button ref={triggerRef} className="location-trigger" type="button" aria-expanded={open} aria-controls="saved-location-options" onClick={() => setOpen((current) => !current)}>
      <span>{activeLocation.name}</span><i aria-hidden="true">▾</i>
    </button>
    {open && <div id="saved-location-options" className="location-menu">
      <span className="section-kicker">Saved locations</span>
      <div className="saved-locations">
        {locations.map((location) => <div className={location.id === activeLocation.id ? 'saved-location active' : 'saved-location'} key={location.id}>
          <button type="button" aria-pressed={location.id === activeLocation.id} onClick={() => { selectLocation(location.id); setOpen(false) }}><i aria-hidden="true" /><span><strong>{location.name}</strong><small>{location.timezone}</small></span></button>
          <button type="button" className="manage-location" aria-label={`Edit ${location.name}`} onClick={() => { setEditor({ location }); setOpen(false) }}>Edit</button>
          <button type="button" className="manage-location delete" aria-label={`Delete ${location.name}`} onClick={() => { setConfirmDelete(location); setOpen(false) }}>Delete</button>
        </div>)}
      </div>
      <button className="add-location" type="button" onClick={() => { setEditor({}); setOpen(false) }}>+ Add location</button>
    </div>}
    {editor && <LocationEditor key={editor.location?.id ?? 'new'} location={editor.location} onClose={closeEditor} onSave={(input) => editor.location ? updateLocation(editor.location.id, input) : addLocation(input)} />}
    {confirmDelete && <DeleteLocationDialog location={confirmDelete} isLastLocation={locations.length === 1} onClose={closeConfirmation} onDelete={() => deleteLocation(confirmDelete.id)} />}
  </div>
}
