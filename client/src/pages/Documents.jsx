const documents = [
  {
    icon: '\uD83D\uDCDD',
    title: 'Player Registration Form 2026',
    description: 'Official BBSF player registration form for the 2026 billiards season. Required for all players participating in sanctioned tournaments.',
    info: '2026 Season',
    href: '/docs/player-registration-form-2026.pdf',
  },
  {
    icon: '\uD83D\uDC65',
    title: 'Team Registration Form',
    description: 'Team roster and registration form for OWBA sanctioned team tournaments. Submit to the OWBA before the 24-hour deadline prior to tournament start.',
    info: '2026 Season',
    href: '/docs/team-registration-form-2026.pdf',
  },
  {
    icon: '\uD83C\uDFE0',
    title: 'OWBA Bylaws',
    description: 'Official bylaws of the Orange Walk Billiards Association governing all local sanctioned play and association conduct.',
    info: 'Updated February 2025',
    href: '/docs/owba-bylaws.pdf',
  },
  {
    icon: '\uD83C\uDFDB\uFE0F',
    title: 'BBSF Federation Bylaws \u2014 September 2025',
    description: 'Latest national federation bylaws from the BBSF. Updated September 2025 with new rules including tie-breaker procedures, player grace periods, and updated dress code penalties.',
    info: 'Updated September 2025',
    href: '/docs/bbsf-bylaws-september-2025.pdf',
  },
];

function DocumentCard({ icon, title, description, info, href }) {
  return (
    <div className="bg-felt-light rounded-xl border border-[#333] hover:border-gold/50 hover:shadow-lg hover:shadow-gold/5 transition-all p-6 flex flex-col gap-4">
      <div className="text-4xl">{icon}</div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-light-gold mb-2">{title}</h3>
        <p className="text-muted text-sm leading-relaxed mb-3">{description}</p>
        {info && (
          <p className="text-xs text-gold/60">{info}</p>
        )}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="inline-flex items-center justify-center gap-2 bg-green hover:bg-dark-green text-light-gold font-medium py-2.5 px-5 rounded-lg transition-colors border border-gold/30 text-sm w-full"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </a>
    </div>
  );
}

export default function Documents() {
  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div
        className="text-center mb-10 py-8 rounded-lg border-b border-[#333]"
        style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          {'\uD83D\uDCC4'} Downloads
        </h1>
        <p className="text-muted text-sm mt-2 max-w-md mx-auto">
          Download official OWBA documents, registration forms, and federation bylaws.
        </p>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {documents.map((doc) => (
          <DocumentCard key={doc.title} {...doc} />
        ))}
      </div>

      {/* Contact / Inquiry Section */}
      <div className="rounded-xl border border-[#333] bg-felt-light p-6 sm:p-8">
        <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-4">
          Submit a Concern or Inquiry
        </div>
        <p className="text-muted text-sm leading-relaxed max-w-xl">
          If you have any questions, concerns, or inquiries regarding documents, regulations, or
          association matters, please reach out directly to the{' '}
          <span className="text-light-gold font-semibold">OWBA Executive Body</span>. You may
          contact any board member in person or through the association&apos;s official communication
          channels.
        </p>
      </div>
    </div>
  );
}
