// ADMIN: view all users and provision new STAFF accounts.

import { useEffect, useState } from 'react'
import * as userService from '../../services/userService'
import { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { emitDataChanged } from '../../utils/events'
import { RoleBadge, DeptBadge } from '../../components/badges'
import { EmptyState, Modal, Spinner } from '../../components/ui'
import { IconPlus, IconUsers } from '../../components/icons'
import { DEPARTMENTS } from '../../constants'
import { initials } from '../../utils/format'

const EMPTY = { name: '', email: '', password: '', department: 'GENERAL' }

export default function StaffManagement() {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    userService
      .listUsers()
      .then((results) => {
        setUsers(results)
        setLoadError('')
      })
      .catch((err) => {
        setUsers([])
        setLoadError(apiError(err))
      })

  useEffect(() => {
    load()
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      const message = 'All fields are required.'
      setError(message)
      toast.push(message, 'error')
      return
    }
    if (form.password.length < 6) {
      const message = 'Password must be at least 6 characters.'
      setError(message)
      toast.push(message, 'error')
      return
    }
    setBusy(true)
    try {
      await userService.createStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        department: form.department,
      })
      emitDataChanged()
      toast.push(`Staff account created for ${form.name.trim()}.`, 'success')
      setModalOpen(false)
      setForm(EMPTY)
      await load()
    } catch (err) {
      const message = apiError(err)
      setError(message)
      toast.push(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!users) return <Spinner />
  const staff = users.filter((u) => u.role === 'STAFF')
  const customers = users.filter((u) => u.role === 'USER')
  const admins = users.filter((u) => u.role === 'ADMIN')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff & Users</h1>
          <p className="page-sub">{customers.length} user(s) · {staff.length} staff member(s) · {admins.length} administrator(s)</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconPlus size={16} /> Add Staff Member
        </button>
      </div>

      {loadError && <div className="alert alert-error">{loadError}</div>}

      <section className="card staff-directory-section">
        <div className="panel row-between staff-directory-heading">
          <div><span className="dashboard-eyebrow">CUSTOMER ACCOUNTS</span><h2 className="card-title mt-8">Users</h2></div>
          <span className="staff-directory-count">{customers.length}</span>
        </div>
        {customers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Account type</th></tr></thead>
              <tbody>{customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="cell-strong">{customer.name}</td>
                  <td className="cell-muted">{customer.email}</td>
                  <td><RoleBadge role={customer.role} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={<IconUsers size={26} />} title="No user accounts found" />}
      </section>

      <section className="card staff-directory-section">
        <div className="panel row-between staff-directory-heading">
          <div><span className="dashboard-eyebrow">SERVICE TEAM</span><h2 className="card-title mt-8">Staff members</h2><p className="card-sub">Team members and their assigned service areas</p></div>
          <span className="staff-directory-count">{staff.length}</span>
        </div>
        {staff.length ? (
          <div className="staff-directory-grid">
            {staff.map((member) => (
              <article className="staff-directory-card" key={member.id}>
                <div className="staff-directory-avatar" aria-hidden="true">{initials(member.name)}</div>
                <div className="staff-directory-info">
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                  <div className="staff-directory-badges">
                    <RoleBadge role={member.role} />
                    {member.department ? <DeptBadge department={member.department} /> : <span className="muted small">No department</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={<IconUsers size={26} />} title="No staff members yet" hint="Create a staff account to add someone to the service team." />}
      </section>

      {admins.length > 0 && (
        <section className="card staff-directory-section">
          <div className="panel row-between staff-directory-heading">
            <div><span className="dashboard-eyebrow">SYSTEM ACCESS</span><h2 className="card-title mt-8">Administrators</h2></div>
            <span className="staff-directory-count">{admins.length}</span>
          </div>
          <div className="staff-directory-grid">
            {admins.map((admin) => (
              <article className="staff-directory-card" key={admin.id}>
                <div className="staff-directory-avatar" aria-hidden="true">{initials(admin.name)}</div>
                <div className="staff-directory-info">
                  <h3>{admin.name}</h3>
                  <p>{admin.email}</p>
                  <div className="staff-directory-badges"><RoleBadge role={admin.role} /></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal open={modalOpen} title="Add staff member" onClose={() => setModalOpen(false)}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit} noValidate id="staff-form">
          <div className="field">
            <label className="label" htmlFor="sname">
              Full name <span className="required">*</span>
            </label>
            <input id="sname" className="input" value={form.name} onChange={set('name')} autoFocus placeholder="e.g. Priya Nair" />
          </div>
          <div className="field">
            <label className="label" htmlFor="semail">
              Email <span className="required">*</span>
            </label>
            <input id="semail" type="email" className="input" value={form.email} onChange={set('email')} placeholder="priya@resolvenow.com" />
          </div>
          <div className="form-row">
            <div className="field">
              <label className="label" htmlFor="spassword">
                Temp password <span className="required">*</span>
              </label>
              <input id="spassword" type="text" className="input" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" />
            </div>
            <div className="field">
              <label className="label" htmlFor="sdept">
                Department
              </label>
              <select id="sdept" className="select" value={form.department} onChange={set('department')}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="staff-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create Staff Account'}
          </button>
        </div>
      </Modal>
    </>
  )
}