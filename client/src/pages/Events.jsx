import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('owba_token');
const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const TAG_STYLES = {
  National: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
  Upcoming: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  Past: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
};

const ALL_TAGS = ['National', 'Upcoming', 'Past'];

const emptyForm = {
  title: '',
  description: '',
  date: '',
  status: 'upcoming',
  tags: [],
  image_url: '',
};

function TagBadge({ tag }) {
  const style = TAG_STYLES[tag] || 'bg-gray-600/20 text-gray-400 border-gray-500/30';
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${style}`}>
      {tag}
    </span>
  );
}

function EventForm({ form, setForm, onSubmit, onCancel, isEditing }) {
  const handleTagToggle = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  return (
    <div className="bg-felt-light rounded-xl border border-[#333] p-6 mb-8">
      <h3 className="text-lg font-semibold text-light-gold mb-4">
        {isEditing ? 'Edit Event' : 'Create New Event'}
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm text-muted mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full bg-dark border border-[#333] rounded-lg px-4 py-2 text-light-gold focus:outline-none focus:border-gold/50"
            placeholder="Event title"
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-dark border border-[#333] rounded-lg px-4 py-2 text-light-gold focus:outline-none focus:border-gold/50 resize-none"
            placeholder="Event description"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-dark border border-[#333] rounded-lg px-4 py-2 text-light-gold focus:outline-none focus:border-gold/50"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full bg-dark border border-[#333] rounded-lg px-4 py-2 text-light-gold focus:outline-none focus:border-gold/50"
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1">Flyer Image URL</label>
          <input
            type="text"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full bg-dark border border-[#333] rounded-lg px-4 py-2 text-light-gold focus:outline-none focus:border-gold/50"
            placeholder="/flyers/event-flyer.jpeg"
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-2">Tags</label>
          <div className="flex gap-3">
            {ALL_TAGS.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={form.tags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                  className="accent-gold w-4 h-4"
                />
                <span className="text-sm text-light-gold">{tag}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-green hover:bg-dark-green text-light-gold font-medium py-2 px-5 rounded-lg transition-colors border border-gold/30 text-sm"
          >
            {isEditing ? 'Update Event' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-600/40 hover:bg-gray-600/60 text-muted font-medium py-2 px-5 rounded-lg transition-colors border border-[#444] text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function EventCard({ event, isAdmin, onEdit, onDelete }) {
  const [showFullImage, setShowFullImage] = useState(false);
  const tags = event.tags ? event.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const formattedDate = event.date
    ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <div className="bg-felt-light rounded-xl border border-[#333] hover:border-gold/30 transition-all overflow-hidden">
        {/* Flyer image */}
        {event.image_url && (
          <div
            className="cursor-pointer overflow-hidden"
            onClick={() => setShowFullImage(true)}
          >
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-48 sm:h-56 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gold leading-tight">{event.title}</h3>
              {formattedDate && (
                <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {formattedDate}
                </p>
              )}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-muted text-sm leading-relaxed mb-4">{event.description}</p>
          )}

          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t border-[#333]">
              <button
                onClick={() => onEdit(event)}
                className="text-xs text-blue-300 hover:text-blue-200 font-medium transition-colors"
              >
                Edit
              </button>
              <span className="text-[#444]">|</span>
              <button
                onClick={() => onDelete(event.id)}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-size image modal */}
      {showFullImage && event.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={event.image_url}
              alt={event.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute -top-3 -right-3 bg-dark border border-gold/40 text-light-gold rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gold hover:text-dark transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...form,
          tags: form.tags.join(','),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }
      setShowForm(false);
      setForm({ ...emptyForm });
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE}/events/${editingId}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          ...form,
          tags: form.tags.join(','),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update event');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (event) => {
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date || '',
      status: event.status || 'upcoming',
      tags: event.tags ? event.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      image_url: event.image_url || '',
    });
    setEditingId(event.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete event');
      }
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const pastEvents = events.filter((e) => e.status === 'past');

  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div
        className="text-center mb-10 py-8 rounded-lg border-b border-[#333]"
        style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          Events
        </h1>
        <p className="text-muted text-sm mt-2 max-w-md mx-auto">
          Stay up to date with upcoming tournaments, showdowns, and community events.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/40 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200 font-bold">
            X
          </button>
        </div>
      )}

      {/* Admin create button */}
      {isAdmin && !showForm && (
        <div className="mb-6">
          <button
            onClick={() => {
              setForm({ ...emptyForm });
              setEditingId(null);
              setShowForm(true);
            }}
            className="bg-green hover:bg-dark-green text-light-gold font-medium py-2 px-5 rounded-lg transition-colors border border-gold/30 text-sm inline-flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Event
          </button>
        </div>
      )}

      {/* Admin form */}
      {isAdmin && showForm && (
        <EventForm
          form={form}
          setForm={setForm}
          onSubmit={editingId ? handleUpdate : handleCreate}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-muted text-sm mt-3">Loading events...</p>
        </div>
      )}

      {/* No events */}
      {!loading && events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted text-sm">No events found.</p>
        </div>
      )}

      {/* Upcoming Events */}
      {!loading && upcomingEvents.length > 0 && (
        <div className="mb-10">
          <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-5">
            Upcoming Events
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {!loading && pastEvents.length > 0 && (
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-5">
            Past Events
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
