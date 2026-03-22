import db, { initializeDatabase } from './db.js';

// Ensure the migration for image_url runs
initializeDatabase();

const events = [
  {
    title: 'King of the Table',
    description: 'National billiards championship event showcasing the best players from across Belize.',
    date: '2026-04-15',
    status: 'upcoming',
    tags: 'National,Upcoming',
    image_url: '/flyers/king-of-the-table.jpeg',
  },
  {
    title: 'King James Partners Tournament',
    description: 'Partners tournament hosted by King James. Teams of two compete in a double-elimination format.',
    date: '2026-04-05',
    status: 'upcoming',
    tags: 'Upcoming',
    image_url: '/flyers/king-james-partners-tournament.jpeg',
  },
  {
    title: "Chill N' Ice Pool Showdown",
    description: "Pool showdown event at Chill N' Ice. Open to all registered OWBA players.",
    date: '2026-03-29',
    status: 'upcoming',
    tags: 'Upcoming',
    image_url: '/flyers/chill-n-ice-pool-showdown.jpeg',
  },
  {
    title: 'Belize Billiards Top Players Clash',
    description: 'Elite tournament featuring the top-ranked players from all districts competing for the national title.',
    date: '2026-05-10',
    status: 'upcoming',
    tags: 'Upcoming',
    image_url: '/flyers/top-players-clash.jpeg',
  },
  {
    title: 'Partner Billiards Tournament 2026',
    description: "Partners tournament held at J's Coolspot. Teams competed in a race-to-5 format.",
    date: '2026-02-15',
    status: 'past',
    tags: 'Past',
    image_url: '/flyers/partner-tournament-js-coolspot.jpeg',
  },
];

// Clear existing events and insert fresh
db.exec('DELETE FROM events');

const insert = db.prepare(`
  INSERT INTO events (title, description, date, status, tags, image_url)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const e of events) {
  insert.run(e.title, e.description, e.date, e.status, e.tags, e.image_url);
}

console.log(`Seeded ${events.length} events with flyer images.`);
