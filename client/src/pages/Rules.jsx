import { useState, useMemo } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────
function getSearchText(rule) {
  let text = rule.title;
  for (const s of rule.sections) {
    if (typeof s === 'string') text += ' ' + s;
    else if (s.penalty) text += ' ' + (Array.isArray(s.penalty) ? s.penalty.join(' ') : s.penalty);
    else if (s.note) text += ' ' + s.note;
  }
  return text.toLowerCase();
}

function renderText(text) {
  const m = text.match(/^((?:\u2022\s*)?\([A-Z]\))\s*/);
  if (m) return <><strong>{m[1]}</strong> {text.slice(m[0].length)}</>;
  return text;
}

// ─── OWBA Rules (21 rules) ──────────────────────────────────────────────
const owbaRules = [
  {
    num: 1,
    title: 'Conduct, Sportsmanship & Behavioral Rules (A\u2013F)',
    sections: [
      '(A) Good Sportsmanship and Behavioral Conduct is a must at all times.',
      { penalty: 'Failure to do so may result in suspension, fine and/or disqualification depending on the severity of the behavior reported by the referee and decided by the OWBA.' },
      '(B) No outside coaching is allowed by any player or fan. Fan misconduct falls under the responsibility of the hosting club.',
      { penalty: 'Failure to abide will constitute a foul. Any outside player engaged is subject to a foul and a possible fine to be determined by OWBA.' },
      '(C) A player must not hit the table in any violent manner/circumstance \u2014 neither with his/her hands, feet or cue stick.',
      { penalty: ['1st Offense: Warning', '2nd Offense: Foul'] },
      '(D) The Referee/Umpire has full authority over a match and venue when presiding over a game under supervision of the O.W.B.A. Every player must respect the Referee/Umpire at all times.',
      { penalty: ['1st Offense: Foul + $25.00 fine', '2nd Offense: Foul + $50.00 fine + Suspension of 2 games'] },
      { note: 'Disrespect is defined as any use of obscene language, threatening words, and/or physical altercations.' },
      '(E) Physical altercations will not be allowed within premises.',
      { penalty: 'Loss of Game + Suspension or Disqualification + Fine of $50.00 + O.W.B.A. Review' },
      '(F) No use of obscene language is allowed by any player at any time \u2014 neither during nor after a match.',
      { penalty: ['1st Offense: Warning + $10.00 Fine', '2nd Offense: Foul + $10.00 Fine'] },
    ],
  },
  {
    num: 2,
    title: 'OWBA Executive Intervention During a Match',
    sections: [
      'The O.W.B.A. Executive Body can intervene at any time during a match if any incident arises, by firstly addressing the Referee/Umpire and then the players thereafter.',
    ],
  },
  {
    num: 3,
    title: 'No Alcohol or Smoking During a Match',
    sections: [
      'Consumption of any alcoholic beverage and/or cigarette smoking during a match is not allowed. Only if authorized by O.W.B.A. for that specific tournament, and if so, it is only allowed in the player\'s neutral designated corner.',
      { penalty: 'Failure to comply constitutes a foul.' },
    ],
  },
  {
    num: 4,
    title: 'No Illicit Drugs During a Match',
    sections: [
      'Consumption of any illicit drug by any player will not be allowed during any match.',
      { penalty: ['1st Offense: Foul + $25.00 fine + forfeit of the match', '2nd Offense: Foul + $50.00 fine + Suspension of 2 games'] },
    ],
  },
  {
    num: 5,
    title: 'Uniform & Dress Code / Weapons Policy',
    sections: [
      'Players upon presenting themselves for a match must wear the required uniform as stated by B.B.S.F. rules. Players must use long pants, uniform shirt, and closed-up footwear. (Belikin Tournament only)',
      'No player is allowed to play while in possession of a knife, firearm, pointed object, or any dangerous tool. Only on-duty Government of Belize Law Enforcement Officers (e.g. Police) are permitted, but they must not consume alcoholic beverages. The firearm must remain strapped in the holster and concealed at all times during their match.',
      { penalty: 'Immediate forfeit from the match.', label: 'Penalty (Uniform):' },
      { penalty: 'Loss of match + $50.00 fine.', label: 'Penalty (Weapon):' },
    ],
  },
  {
    num: 6,
    title: 'Players Must Remain in Neutral Corner',
    sections: [
      'Players must remain in the neutral corner until instructed by the referee.',
      { penalty: ['1st Offense: Foul', '2nd Offense: Foul + $10.00 Fine'] },
    ],
  },
  {
    num: 7,
    title: 'No Physical Contact with the Pocket While Calling a Shot',
    sections: [
      'Physical contact (with hands/cue stick) with the pocket while calling or indicating a shot during the game is not allowed.',
      { penalty: ['1st Offense: Warning', '2nd Offense: Foul'] },
    ],
  },
  {
    num: 8,
    title: 'Shot Clock \u2013 30 Second Rule with Extension',
    sections: [
      'A player is allowed 30 seconds to make a legal shot. However, the player is allowed a 30-second extension per game, giving them a total of 1 minute to make a legal shot. If a player requests a second extension during a game it is not considered a foul and their time runs until the 60-second limit.',
      { penalty: 'Failure to make a legal shot within the allotted time constitutes a foul.' },
    ],
  },
  {
    num: 9,
    title: 'Anti-Bullying Policy (In-Person & Online)',
    sections: [
      'Bullying is not allowed \u2014 face to face nor in the Official OWBA WhatsApp Group Chat.',
      { note: 'Bullying is defined as the act of causing physical and/or mental harm, mistreatment, intimidation, coercing and/or abuse either by verbal, physical or online actions (Cyber Crime) of someone who is vulnerable.', label: 'Definition:' },
      { penalty: ['1st Offense: Warning + $25.00 Fine', '2nd Offense: Suspension of 3 games + $50.00 Fine', '3rd Offense: Disqualification from OWBA Sanctioned Tournaments for 1 year + $100.00 Fine'] },
    ],
  },
  {
    num: 10,
    title: 'No Player Switching Once a Tournament Has Started',
    sections: [
      'All registered players must keep active with their respective team during a tournament. No switching of players is allowed once a tournament has started.',
      { penalty: 'Permanent disqualification from the tournament + $10.00 fine.' },
    ],
  },
  {
    num: 11,
    title: 'Team Rosters, Player Registration & Grace Period (A\u2013D)',
    sections: [
      '(A) All participating teams must present a team roster on or before 24 hours prior to the beginning of a tournament.',
      { penalty: 'Disqualification from participating in the tournament.' },
      '(B) A team may replace/add a player to their roster within 24 hours of the beginning of a tournament; however, this carries a late registration fee of $25.00 per player.',
      '(C) A minimum of 3 players are required to begin a match in a 5-man tournament, and a minimum of 2 players in a 3-man tournament. A grace period of 5 minutes will be allowed.',
      { penalty: 'Forfeit of match + $5.00 fine per player who does not present themselves.' },
      '(D) Any misspelled name submitted for a line-up (1 or 2 letters) may not be considered a loss of match and can be corrected before the match starts.',
      { penalty: 'If not corrected before match: Forfeit of match.' },
    ],
  },
  {
    num: 12,
    title: 'Cell Phones During a Match (A\u2013B)',
    sections: [
      '(A) Cell phones are allowed to be carried but may not be answered during the match and must be put on silent mode.',
      { penalty: ['1st Offense: Foul', '2nd Offense: Foul + $10.00 Fine'] },
      '(B) In cases of emergencies, cell phones can be answered with the approval of the Referee/Umpire who will determine the course of action.',
    ],
  },
  {
    num: 13,
    title: 'Home and Away Tournament Format',
    sections: [
      'All tournaments must be played on a home and away basis, unless stipulated otherwise by the organizers.',
    ],
  },
  {
    num: 14,
    title: 'Sanctioned Tournaments, Registration & Membership (A\u2013D)',
    sections: [
      '(A) Tournaments not sanctioned by the O.W.B.A. do not fall under O.W.B.A. rules. Organizers cannot hold the O.W.B.A. responsible for any incidents or disputes.',
      '(B) Only players registered with the O.W.B.A. will be allowed to participate in O.W.B.A. sanctioned tournaments.',
      '(C) Out-district players can be allowed to participate in any O.W.B.A. sanctioned tournament on the recommendation of the O.W.B.A. Executive Body.',
      '(D) O.W.B.A. Membership Fee: $10.00 per player per year. Late registration carries an additional $5.00 fee after the announced deadline.',
    ],
  },
  {
    num: 15,
    title: 'Fines Must Be Paid Before Next Match',
    sections: [
      'All fines applied on a player must be paid before the beginning of their next match or by the deadline set by the O.W.B.A.',
      { penalty: 'Disqualification from participating in the ongoing tournament/match.' },
    ],
  },
  {
    num: 16,
    title: 'OWBA Falls Under BBSF Rules',
    sections: [
      'The O.W.B.A. Bylaws fall under the rules and regulations of the Belize Billiards Sport Federation (B.B.S.F.).',
    ],
  },
  {
    num: 17,
    title: 'Executive Committee Attendance',
    sections: [
      'Any O.W.B.A. Executive Committee member who is absent from 3 consecutive executive meetings will be removed and replaced.',
    ],
  },
  {
    num: 18,
    title: 'AGM & Election of Executive',
    sections: [
      'The Annual General Meeting (AGM) and election of O.W.B.A. Executive must be done before the beginning of each B.B.S.F. Billiards Year. Terms are 2 years.',
    ],
  },
  {
    num: 19,
    title: 'Financial Statements \u2013 Twice a Year',
    sections: [
      'Financial statements must be presented to association members twice a year.',
    ],
  },
  {
    num: 20,
    title: 'Required Executive Meetings Before Key Events',
    sections: [
      'Executive meetings must be held before the following (if required):',
      '\u2022 (A) O.W.B.A. Sanctioned Tournament begins',
      '\u2022 (B) O.W.B.A. Sanctioned Tournament Semi-Finals begin',
      '\u2022 (C) O.W.B.A. Sanctioned Tournament Finals begin',
      '\u2022 (D) In January \u2014 to prepare the billiards calendar year, financial reports, and/or if there is an election year',
    ],
  },
  {
    num: 21,
    title: 'Amendment of Bylaws',
    sections: [
      'The O.W.B.A. Bylaws can only be amended and passed by a majority vote in an official O.W.B.A. Executive Meeting. Any rule or regulation not amended by such a manner will be deemed unconstitutional and illegal.',
    ],
  },
];

// ─── BBSF Rules (39 rules) ─────────────────────────────────────────────
const bbsfRules = [
  {
    num: 1,
    title: 'Sportsmanship, Conduct & Language',
    sections: [
      'Good sportsmanship and behavioral conduct is required at all times during all BBSF-sanctioned events.',
      { penalty: [
        'Before/after match obscene language: $25.00 fine',
        'During match \u2014 1st Offense: Foul',
        'During match \u2014 2nd Offense: Loss of rack',
        'During match \u2014 3rd Offense: Loss of match + $50.00 fine',
        'Obscene language directed at an official: Loss of match + 3-match suspension + $50.00 fine',
        'Obscene language directed at others: $25.00 fine',
      ] },
    ],
  },
  {
    num: 2,
    title: 'No Breaking or Dismantling Cue Stick',
    sections: [
      'Players cannot break or dismantle their cue stick without umpire permission. This is considered unsportsmanlike conduct.',
      { penalty: 'Forfeit of match.' },
    ],
  },
  {
    num: 3,
    title: 'No Alcohol or Smoking During a Match',
    sections: [
      'Alcoholic beverages and smoking are prohibited during match play. Non-alcoholic drinks are allowed in sealed containers only.',
      { penalty: ['1st Offense: Foul', '2nd Offense: Loss of rack', '3rd Offense: Loss of match + $25.00 fine'] },
    ],
  },
  {
    num: 4,
    title: 'No Weapons or Dangerous Objects',
    sections: [
      'No player shall be in possession of any weapon, firearm, knife, pointed object, or dangerous tool while participating in any BBSF-sanctioned event.',
      { penalty: 'Loss of match + $50.00 fine.' },
    ],
  },
  {
    num: 5,
    title: 'Cell Phones Must Be Turned Off During a Match',
    sections: [
      'Cell phones must be turned off during matches.',
      { penalty: ['1st Offense: Foul', '2nd Offense: Forfeit of game (rack)', '3rd Offense: Loss of match'] },
    ],
  },
  {
    num: 6,
    title: 'Dress Code & Uniform Requirements',
    sections: [
      'From lag onwards, players must wear: sleeved shirts (or matching team uniform), long pants, and closed-up footwear. No head rags or earpieces (unless medically prescribed). No sandals or slippers.',
      { penalty: 'Failure to adhere to head rags, earpiece and closed-up footwear requirements results in automatic loss of match.' },
      { note: 'National Open Tournaments allow tee-shirts with sleeves (no uniform required).' },
    ],
  },
  {
    num: 7,
    title: 'National Tournament Uniform Penalty',
    sections: [
      'In National Tournaments, improper uniform does not result in match loss. Monetary penalties apply instead.',
      { penalty: ['$100.00 per rack for shirt offence until corrected', '$100.00 per rack for pants offence until corrected'] },
    ],
  },
  {
    num: 8,
    title: 'Players Must Stay in Neutral Corner',
    sections: [
      'Players must remain seated in their designated neutral corner when not at the table. A player may not distract their opponent while they are shooting or scrutinizing the table. Standing behind or near the opponent during their turn is not allowed.',
      { penalty: 'Foul.' },
    ],
  },
  {
    num: 9,
    title: 'Cue Ball on Foul \u2014 Wait for Official',
    sections: [
      'When a foul occurs, the player must wait for the official to provide the cue ball. The opposing player or team captain may query a call in an orderly fashion \u2014 no other team member may do so. A call can only be overturned if both the umpire and shot clock keeper agree.',
      { penalty: ['1st Offense: Foul', 'Subsequent Offenses: Foul + $25.00 fine'] },
    ],
  },
  {
    num: 10,
    title: 'No Outside Coaching',
    sections: [
      'No outside coaching is allowed. Coaching from a teammate is also an infraction. Coaching includes: telling which ball to shoot, advising defense, saying "take your time," clapping, or making remarks.',
      { penalty: ['1st Offense: Foul', '2nd Offense: Loss of rack', '3rd Offense: Loss of match'], label: 'Penalty (Player being coached):' },
      { penalty: ['1st Offense: Warning', '2nd Offense: $50.00 fine + asked to leave venue'], label: 'Penalty (Team coaching):' },
      { penalty: ['1st Offense: Warning', '2nd Offense: $25.00 fine', '3rd Offense: $50.00 fine + expulsion from venue', '4th Offense: Suspension'], label: 'Penalty (Individual tournament):' },
    ],
  },
  {
    num: 11,
    title: 'Team Punctuality & Minimum Players to Start',
    sections: [
      'Teams have 5 minutes to arrive after the official call and must be present 15 minutes before match time. Minimum to start: 3 of 5 players (five-player roster) or 2 of 3 players (three-player roster).',
      { penalty: 'Loss of matches for teams unable to meet minimum player requirements.' },
    ],
  },
  {
    num: 12,
    title: 'Individual Player Grace Period Per Rack',
    sections: [
      'Individual players have 5 minutes to appear after being called per game. The umpire must allow 5 minutes before each rack starts.',
      { penalty: ['1st: Loss of first rack', '2nd: Loss of second rack', '3rd: Loss of third rack', 'Subsequent: Loss of each rack'] },
    ],
  },
  {
    num: 13,
    title: 'Match Format \u2014 Race to 5 (9-ball), Race to 3/4 (8-ball)',
    sections: [
      '9-ball: race to 5. 8-ball: race to 3 or 4 (determined pre-tournament). Three wins from a 5-player roster = team win; two wins from a 3-player roster = team win. 5-player rosters allow 7 players total; 3-player rosters allow 5 players total.',
    ],
  },
  {
    num: 14,
    title: 'Teams That Fail Minimum Requirements \u2014 Declared Non-Existent',
    sections: [
      'Teams not meeting minimum player requirements for 3 consecutive matches are considered non-existent and will not be counted as a team.',
    ],
  },
  {
    num: 15,
    title: 'Shot Clock \u2014 45s First Shot, 30s Thereafter, One Extension Per Rack',
    sections: [
      'After the break: first shot = 45 seconds (with an optional 30-second extension). Thereafter = 30 seconds per shot. One 30-second extension is allowed per rack upon request. The umpire calls "10 seconds" before time expires. Each player is allowed ONE extension per rack.',
      { penalty: 'Failure to shoot within the allotted time constitutes a foul.' },
    ],
  },
  {
    num: 16,
    title: 'No Approaching Player During Extension or Between Games',
    sections: [
      'No one may approach a player during an extension or between games.',
      { penalty: ['1st Offense: Foul + $20.00 fine', '2nd Offense: Loss of rack + $40.00 fine', '3rd Offense: Loss of match + $50.00 fine'], label: 'Penalty (Player engaging):' },
      { penalty: ['1st Offense: $25.00 fine', '2nd Offense: $50.00 fine + 1-game suspension', '3rd Offense: Expulsion from venue'], label: 'Penalty (Opposing team):' },
    ],
  },
  {
    num: 17,
    title: 'Tournament Format \u2014 Belikin Nationals Round Robin',
    sections: [
      'The Belikin Nationals MUST be round robin at both the regional (district) and national level, or as otherwise determined by the BBSF.',
    ],
  },
  {
    num: 18,
    title: 'Wait for Umpire Before Breaking',
    sections: [
      'The player breaking must wait for the umpire\'s indication before starting the break.',
    ],
  },
  {
    num: 19,
    title: 'Umpire Has Full Authority',
    sections: [
      'The Umpire has full authority over a match and venue when presiding. Every player must always respect the umpire.',
      { note: 'Non-compliance results in penalties as outlined in Rule 1.' },
    ],
  },
  {
    num: 20,
    title: 'Shot Calling Rules \u2014 Updated (9-ball, 8-ball, 10-ball)',
    sections: [
      '9-ball: the 9-ball must be called before pocketing. 8-ball and 10-ball: "non-obvious" shots must be called.',
      'Calls required for: non-obvious/non-straight shots, bank shots, combination shots, kick shots, caroms, kisses. The 8-ball pocket must always be called.',
      'Calls not required for: obvious straight-in shots.',
    ],
  },
  {
    num: 21,
    title: 'Cue Ball Must Be Struck First with Cue Tip',
    sections: [
      'Players must always shoot the cue ball first with the tip of the cue.',
      { penalty: ['1st Offense: Forfeit of rack/game', '2nd Offense (same match): Forfeit of match'] },
    ],
  },
  {
    num: 22,
    title: '8-Ball Can Be Pocketed Off Another Ball',
    sections: [
      'In 8-ball, it is not necessary for the 8-ball to be pocketed freely or without contact with another ball \u2014 the 8-ball can be legally pocketed off another ball. If the 8-ball is frozen to another ball, it can be legally pocketed. Pocketing the 8-ball in the wrong pocket or scratching while pocketing it results in loss of game.',
    ],
  },
  {
    num: 23,
    title: 'Minimum Teams Per District for National Tournaments',
    sections: [
      'Each district requires a minimum of 4 teams to participate in National Tournaments. Districts with 9 or more teams send 2 teams (1st and 2nd place finishers).',
    ],
  },
  {
    num: 24,
    title: 'Player Sanctions & Appeals Process',
    sections: [
      'Sanctions must be forwarded to the BBSF in writing. A player has 48 hours to appeal to the Association, and 72 hours to appeal to the BBSF if unsatisfied with the Association\'s decision.',
    ],
  },
  {
    num: 25,
    title: 'District Association \u2014 10% Administrative Fee',
    sections: [
      'District Associations are permitted to deduct 10% from monetary prizes for tournament winners as an administrative fee.',
    ],
  },
  {
    num: 26,
    title: 'BBSF Collects 10% from BBSF Tournament Winners',
    sections: [
      'The BBSF deducts 10% from teams/individuals winning BBSF sanctioned tournaments, including the National Belikin Tournament.',
    ],
  },
  {
    num: 27,
    title: 'Annual Financial Statement Required',
    sections: [
      'All District Associations and affiliated leagues must provide a yearly financial statement upon BBSF request, including expense receipts.',
    ],
  },
  {
    num: 28,
    title: 'Annual Registration Fee to BBSF \u2014 Due January 31',
    sections: [
      'Annual fee: $300.00 per year, due by January 31st. The billiards year ends December 31st.',
      { penalty: 'Late fee: 33% surcharge + 10% on accumulating balance (due by March 31st).' },
    ],
  },
  {
    num: 29,
    title: 'Player Registration \u2014 Annual, Forms to BBSF by January 15',
    sections: [
      'All players must register annually with the Association where they reside. Minimum registration fee: $10.00. No player can be registered with more than one billiards association or organization. Registration forms must be submitted to the BBSF by January 15th annually.',
    ],
  },
  {
    num: 30,
    title: 'National Belikin Tournament \u2014 Special Rules',
    sections: [
      'Players must be Belizean (by residency, citizenship, or naturalization). Non-Belizeans must have lived in Belize and played in the last 4 consecutive Belikin tournaments to be eligible.',
      'Only one out-district player per team is allowed.',
      'Transfer fee: $1,000.00 ($300.00 to BBSF, $500.00 to leaving association, $200.00 to receiving association).',
      { penalty: ['1st Offense: Automatic match loss', '2nd Offense: Match loss + $100.00 fine', '3rd Offense: Match loss + expulsion from tournament'] },
    ],
  },
  {
    num: 31,
    title: 'Unregistered Players \u2014 $25 Fee to Participate',
    sections: [
      'Unregistered players must pay a minimum $25.00 registration fee to participate in sanctioned tournaments. This does not apply if the player is registered with another billiards organization.',
    ],
  },
  {
    num: 32,
    title: 'Election of Officers \u2014 Every Three Years',
    sections: [
      'Elections are held every 3 years per BBSF Statutes. Updated officer information must be submitted annually. Associations must hold elections no later than January 15th every three years. The BBSF will not recognize officers who exceed their term without re-election.',
    ],
  },
  {
    num: 33,
    title: 'MVP Determination',
    sections: [
      'Regular Tournament: MVP is the player with the best record from the undefeated team (pre-finals). Ties are decided by the BBSF.',
      'Finals: MVP is the player with the best record from the championship team. Ties are decided by the BBSF.',
    ],
  },
  {
    num: 34,
    title: 'No Tampering with Balls in Pockets',
    sections: [
      'Players are NOT allowed to tamper with balls that are inside the pockets. A player should ask the umpire to empty pockets when necessary.',
      { penalty: 'Foul.' },
    ],
  },
  {
    num: 35,
    title: 'No Forward Movement of Cue Ball with Cue Tip',
    sections: [
      'Players are NOT allowed to move the cue ball in a forward motion using the tip of the cue stick.',
      { penalty: 'Foul.' },
    ],
  },
  {
    num: 36,
    title: 'Playing Opponent\'s Ball or 8-Ball on a "Safe" Call',
    sections: [
      'Players may illegally shoot the 8-ball or an opponent\'s ball using a "Safe" call, but this constitutes a foul.',
      { penalty: 'Foul.' },
    ],
  },
  {
    num: 37,
    title: 'Re-Rack for Stalemate',
    sections: [
      'If a stalemate exists, the umpire alternately gives each player 3 attempts to break the stalemate. If the stalemate persists, the umpire declares it and the balls are re-racked. The player who performed the original break shot will break again for the new game.',
    ],
  },
  {
    num: 38,
    title: 'Bowen & Bowen Products \u2014 Sponsored Tournaments',
    sections: [
      'In Bowen & Bowen sponsored tournaments, players must consume only Bowen & Bowen products during the event.',
      { penalty: ['1st Offense: $50.00 fine', '2nd Offense: Suspension', '3rd Offense: Disqualification'] },
    ],
  },
  {
    num: 39,
    title: 'Tie-Breaker Procedure for Playoffs, Semi-Finals & Finals',
    sections: [
      '5-player roster: 3 nominated players per team compete in a race to 2 team wins.',
      '3-player roster: 1 nominated player per team competes in a single match \u2014 the winner wins the tie-breaker.',
      { note: 'Associations may modify the tie-breaker procedure if decided pre-tournament: 5-player rosters may use all 5 players, and 3-player rosters may use all 3 players. Any modifications must be stated in the written Tournament Ground Rules.' },
      'Finals tie-breakers must be played on the same day and at the same venue.',
      { note: 'Game = rack; Match = general competition between players/teams.', label: 'Definitions:' },
    ],
  },
];

// ─── Rule Card Component ────────────────────────────────────────────────
function RuleCard({ rule, highlight }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`bg-felt-light border rounded-[10px] mb-3.5 overflow-hidden transition-colors ${
        highlight ? 'border-gold' : open ? 'border-gold/40' : 'border-[#333]'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-start gap-4 py-[18px] px-5 cursor-pointer select-none hover:bg-white/[0.03]"
        onClick={() => setOpen(!open)}
      >
        <div className="w-9 h-9 rounded-full bg-dark-green border-2 border-green flex items-center justify-center font-extrabold text-[0.85rem] text-light-gold shrink-0 mt-px">
          {rule.num}
        </div>
        <div className="font-semibold text-[0.95rem] leading-[1.5] flex-1 text-text">
          {rule.title}
        </div>
        <svg
          className={`w-4 h-4 text-muted mt-1 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body */}
      {open && (
        <div className="pb-[18px] pr-5 pl-4 md:pl-[72px] text-[0.88rem] leading-[1.8] text-white/80">
          {rule.sections.map((section, i) => {
            if (typeof section === 'string') {
              return (
                <p key={i} className="mt-2.5">
                  {renderText(section)}
                </p>
              );
            }
            if (section.penalty != null) {
              const label = section.label || 'Penalty:';
              return (
                <div
                  key={i}
                  className="mt-2.5 rounded-r-md py-2.5 px-3.5 text-[0.85rem]"
                  style={{
                    background: 'rgba(180,60,60,0.12)',
                    borderLeft: '3px solid #c0392b',
                  }}
                >
                  <strong className="text-[#e74c3c]">{label}</strong>
                  {Array.isArray(section.penalty) ? (
                    section.penalty.map((line, j) => (
                      <div key={j} className="my-[3px]">{line}</div>
                    ))
                  ) : (
                    <span> {section.penalty}</span>
                  )}
                </div>
              );
            }
            if (section.note != null) {
              const label = section.label || 'Note:';
              return (
                <div
                  key={i}
                  className="mt-2.5 rounded-r-md py-2.5 px-3.5 text-[0.85rem]"
                  style={{
                    background: 'rgba(26,107,58,0.15)',
                    borderLeft: '3px solid #1a6b3a',
                  }}
                >
                  <strong className="text-[#5de08a]">{label}</strong>
                  <span> {section.note}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Rules Page ────────────────────────────────────────────────────
export default function Rules() {
  const [activeTab, setActiveTab] = useState('owba');
  const [search, setSearch] = useState('');

  const currentRules = activeTab === 'owba' ? owbaRules : bbsfRules;

  const filteredRules = useMemo(() => {
    if (!search.trim()) return currentRules;
    const query = search.toLowerCase();
    return currentRules.filter((rule) => getSearchText(rule).includes(query));
  }, [search, currentRules]);

  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div
        className="text-center mb-8 py-6 rounded-lg border-b border-[#333]"
        style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          Official Rules &amp; Bylaws
        </h1>
        <p className="text-muted text-sm mt-1">
          Search and browse all rules governing OWBA sanctioned play
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-8 rounded-[10px] overflow-hidden border border-[#333]">
        <button
          onClick={() => { setActiveTab('owba'); setSearch(''); }}
          className={`flex-1 py-3.5 px-5 text-[0.95rem] font-semibold transition-colors text-center border-r border-[#333] ${
            activeTab === 'owba'
              ? 'bg-green text-white'
              : 'bg-felt-light text-muted hover:bg-felt-lighter hover:text-text'
          }`}
        >
          OWBA Bylaws
          <span className={`inline-block ml-2 px-2 py-0.5 rounded-xl text-xs ${activeTab === 'owba' ? 'bg-black/20' : 'bg-white/[0.15]'}`}>
            {owbaRules.length} rules
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('bbsf'); setSearch(''); }}
          className={`flex-1 py-3.5 px-5 text-[0.95rem] font-semibold transition-colors text-center ${
            activeTab === 'bbsf'
              ? 'bg-green text-white'
              : 'bg-felt-light text-muted hover:bg-felt-lighter hover:text-text'
          }`}
        >
          Federation (BBSF) Bylaws
          <span className={`inline-block ml-2 px-2 py-0.5 rounded-xl text-xs ${activeTab === 'bbsf' ? 'bg-black/20' : 'bg-white/[0.15]'}`}>
            {bbsfRules.length} rules
          </span>
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 items-center mb-7 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-base pointer-events-none">&#128269;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules..."
            className="w-full pl-10 pr-10 py-3 bg-felt-light border border-[#444] rounded-lg text-[0.95rem] text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors text-lg"
            >
              &#10005;
            </button>
          )}
        </div>
        {search && (
          <span className="text-muted text-[0.85rem] whitespace-nowrap">
            {filteredRules.length} {filteredRules.length === 1 ? 'rule' : 'rules'} found
          </span>
        )}
      </div>

      {/* BBSF notice banner (OWBA tab only) */}
      {activeTab === 'owba' && !search && (
        <div className="bg-felt-light border border-[#333] rounded-xl p-6 mb-7">
          <p className="font-bold text-text mb-2">&#128226; Notice &mdash; Federation Bylaws Updated</p>
          <p className="text-muted text-[0.88rem] leading-relaxed">
            The Belize Billiards Sports Federation (BBSF) has issued an updated set of bylaws effective{' '}
            <strong className="text-text">September 2025</strong>. The OWBA is reviewing these changes and an
            updated OWBA bylaws will be announced and provided to all members accordingly.
          </p>
        </div>
      )}

      {/* Ruleset header */}
      {!search && (
        <div className="bg-felt-light border border-[#333] rounded-xl p-6 mb-7">
          {activeTab === 'owba' ? (
            <>
              <h3 className="text-xl font-bold text-gold mb-1.5">OWBA Bylaws</h3>
              <p className="text-muted text-[0.88rem] leading-relaxed">
                These bylaws govern all OWBA sanctioned tournaments and matches in Orange Walk. They operate in conjunction with the BBSF Federation rules, which take precedence on matters not specifically addressed here.
              </p>
              <div className="flex gap-5 mt-3 flex-wrap">
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  Updated <strong className="text-text">February 2025</strong>
                </span>
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  671-3467 / 671-7653
                </span>
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  OWBAOfficial@gmail.com
                </span>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-gold mb-1.5">BBSF Federation Bylaws</h3>
              <p className="text-muted text-[0.88rem] leading-relaxed">
                National federation bylaws updated September 2025. All OWBA events and members are governed by these rules. Where OWBA-specific rules exist, they take local precedence for OWBA events.
              </p>
              <div className="flex gap-5 mt-3 flex-wrap">
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  Updated <strong className="text-text">September 2025</strong>
                </span>
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  President: James Young &mdash; +501-615-2511
                </span>
                <span className="text-[0.8rem] bg-felt-lighter px-3 py-1 rounded-full text-muted">
                  belizebilliardsfederation@gmail.com
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* PDF download bar */}
      {!search && (
        <div className="flex items-center gap-3 bg-felt-light border border-[#444] rounded-lg py-3.5 px-[18px] mb-7 flex-wrap">
          {activeTab === 'owba' ? (
            <>
              <span className="text-gold font-semibold text-[0.9rem]">&#128196; Download OWBA Bylaws PDF</span>
              <span className="text-muted text-[0.82rem]">Updated February 2025 | Signed by OWBA Executive Committee</span>
            </>
          ) : (
            <>
              <span className="text-gold font-semibold text-[0.9rem]">&#128196; Download Updated BBSF Bylaws &mdash; September 2025 PDF</span>
              <span className="text-muted text-[0.82rem]">Updated September 2025 | Belize Billiards Sports Federation</span>
            </>
          )}
        </div>
      )}

      {/* Rule cards */}
      {filteredRules.length > 0 ? (
        <div>
          {filteredRules.map((rule) => (
            <RuleCard key={`${activeTab}-${rule.num}`} rule={rule} highlight={!!search} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted">
          <div className="text-5xl mb-3">&#128269;</div>
          <p>No rules found matching your search.</p>
        </div>
      )}
    </div>
  );
}
