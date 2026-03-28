// ═══════════════════════════════════════════════════════════════
// MISFITS LOADOUT — DATA LAYER
// Single source of truth for all character and game data.
// Future: replace static objects with a Google Sheets fetch.
// ═══════════════════════════════════════════════════════════════

// ─── LADDER ───
const L = {5:'Superb',4:'Great',3:'Good',2:'Fair',1:'Average',0:'Mediocre'};

// ─── SKILL GROUPS ───
const GROUPS = ['Fortitude','Social','Mercenary','Covert','Operate','Academics','Resources'];

// ─── DISPLAY NAME OVERRIDES ───
const SKILL_DISPLAY = {
  Rapport: 'Rapport (charm)',
  Navigate: 'Navigate (vehicle)',
  Contacts: 'Contacts (resource)'
};

// ─── SKILL METADATA (OACD descriptions, group, notes) ───
const SM = {
  Physique:    {g:'Fortitude',  o:'Brute force, break things, grapple',                       c:'Pin someone, reveal physical weakness',                              a:null,                                       d:'Block movement, brace barriers',                                         n:'Adds physical stress and consequence slots based on rating'},
  Athletics:   {g:'Fortitude',  o:'Jump, run, climb, swim, chase',                            c:'High ground, acrobatic maneuver',                                   a:null,                                       d:'Dodge physical attacks, block movement'},
  Will:        {g:'Fortitude',  o:'Resist mental pressure, concentrate, endure',              c:'Deep focus state',                                                  a:null,                                       d:'Defend against Provoke and psychic attacks',                             n:'Adds mental stress and consequence slots. Willpower only — intelligence uses highest Academics skill'},
  Rapport:     {g:'Social',     o:'Charm, inspire, build trust, talk past guards',            c:'Create positive mood, get someone talking, pep talk',               a:null,                                       d:'Defend against reputation damage'},
  Deceive:     {g:'Social',     o:'Bluff, maintain disguise, sleight of hand',               c:'Distraction, cover story, feint',                                   a:null,                                       d:'Defend against Investigate tracking and Empathy reading'},
  Provoke:     {g:'Social',     o:'Intimidate for information, scare into action',           c:'Create emotional states: Enraged, Shocked, Hesitant',               a:'Mental attack — deal mental stress',        d:null},
  Empathy:     {g:'Social',     o:'Catch a change in attitude or intent',                    c:'Read emotional state, find breaking points, discover aspects',      a:null,                                       d:'Defend against Deceive and social manipulation',                        n:'Main skill for healing mental consequences (counsel)'},
  Contacts:    {g:'Social',     o:'Find someone, access information networks',               c:'Know the right person, establish gossip networks',                  a:null,                                       d:'Defend against social advantages, resist being found'},
  Shoot:       {g:'Mercenary',  o:'Weapon knowledge, demonstrate marksmanship',              c:'Suppressing fire, trick shots, pin someone down',                   a:'Ranged attack — up to 2 zones away',       d:null},
  Fight:       {g:'Mercenary',  o:'Regulated bout, combat demonstration',                    c:'Targeted strike, disarm, dirty move, spot weakness',                a:'Melee attack — same zone only',            d:'Defend against Fight attacks and close-quarters actions'},
  Survival:    {g:'Mercenary',  o:'Navigate terrain, find food/water, notice danger, field medicine', c:'Spot escape routes, set traps, create environmental aspects', a:null,                                  d:'Defend against Stealth ambush and ranged attacks while in cover',       n:'Replaces Notice. Counts as +1 Medicine for first aid purposes'},
  Burglary:    {g:'Covert',     o:'Bypass locks and traps, pickpocket, cover tracks',        c:'Case a location, discover security vulnerabilities',                a:null,                                       d:null},
  Stealth:     {g:'Covert',     o:'Sneak past sentries, hide, avoid leaving evidence',       c:'Set up ambush position, go unnoticed',                              a:null,                                       d:'Foil attempts to find or track you'},
  Investigate: {g:'Covert',     o:'Search records, analyze data, notice details',            c:'Uncover clues, establish surveillance, examine evidence',           a:null,                                       d:null,                                                                    n:'Fallback for notice checks that don\'t fit another skill'},
  Drive:       {g:'Operate',    o:'Vehicle movement through difficult conditions, chases',   c:'Create driving aspects, block opponents in a race',                 a:'Ram — but you take the same harm',         d:'Dodge attacks aimed at your vehicle'},
  Pilot:       {g:'Operate',    o:'Fly through rough conditions, emergency maneuvers',       c:'Gain position, outmaneuver in space combat',                        a:'Ram — but you take the same harm',         d:'Dodge attacks aimed at your ship'},
  Navigate:    {g:'Operate',    o:'Find a route through challenging terrain or space',       c:'Strategic positioning, find shortcuts, maneuver opponents',         a:null,                                       d:null},
  Engineering: {g:'Academics',  o:'Build, break, or fix machinery with time and tools',      c:'Spot features or flaws in machinery, jury-rig, sabotage',          a:null,                                       d:null,                                                                    n:'Also covers Gunnery knowledge (Gunnery skill removed)'},
  Medicine:    {g:'Academics',  o:'Check vitals, diagnose, neutralize or administer poison', c:'Drug effects on targets, identify physical weak points',            a:null,                                       d:null,                                                                    n:'Main skill for healing physical consequences'},
  Science:     {g:'Academics',  o:'Apply scientific knowledge to achieve a goal',            c:'Research-based aspects, introduce scientific facts',                a:null,                                       d:null},
  Culture:     {g:'Academics',  o:'Know history, law, customs, current events, theology',   c:'Introduce cultural knowledge as scene aspects',                    a:null,                                       d:null}
};

// ─── PARTY SKILL RATINGS (for teamwork viewer) ───
const PS = {
  Physique:    {Cap:5, Howard:1, Thowra:2},
  Athletics:   {Cap:2, Howard:2, Thowra:2},
  Will:        {Cap:2, Howard:4, Thowra:4},
  Rapport:     {Cap:3, Howard:0, Thowra:0},
  Deceive:     {Cap:1, Howard:1, Thowra:3},
  Provoke:     {Cap:1, Howard:1, Thowra:3},
  Empathy:     {Cap:0, Howard:0, Thowra:5},
  Contacts:    {Cap:2, Howard:1, Thowra:0},
  Shoot:       {Cap:3, Howard:1, Thowra:4},
  Fight:       {Cap:3, Howard:2, Thowra:0},
  Survival:    {Cap:4, Howard:0, Thowra:2},
  Burglary:    {Cap:0, Howard:3, Thowra:0},
  Stealth:     {Cap:0, Howard:3, Thowra:1},
  Investigate: {Cap:0, Howard:2, Thowra:1},
  Drive:       {Cap:1, Howard:0, Thowra:0},
  Pilot:       {Cap:1, Howard:0, Thowra:2},
  Navigate:    {Cap:1, Howard:0, Thowra:0},
  Engineering: {Cap:0, Howard:5, Thowra:0},
  Medicine:    {Cap:0, Howard:3, Thowra:1},
  Science:     {Cap:0, Howard:2, Thowra:1},
  Culture:     {Cap:2, Howard:0, Thowra:0}
};

// ─── HARRY THE HAULER SHIP SKILLS ───
const HS = {
  Shoot:       {nm:'Weapons',        rt:1},
  Burglary:    {nm:'Smuggle',        rt:3},
  Investigate: {nm:'Sensors',        rt:2},
  Pilot:       {nm:'Maneuverability',rt:2},
  Navigate:    {nm:'Sensors',        rt:2},
  Science:     {nm:'Sensors',        rt:2}
};

// ─── TEAMWORK RESTRICTIONS ───
const TR = {
  Will:        'Cannot teamwork',
  Drive:       'Cannot teamwork',
  Pilot:       'PCs cannot teamwork — only with Harry',
  Empathy:     'Healing purposes only',
  Stealth:     'Cannot physically teamwork — instructions OK'
};

// ─── ACTION → SKILL MAPPING ───
const AM = {
  attack:  ['Shoot','Fight','Provoke'],
  defend:  ['Athletics','Will','Fight','Survival'],
  overcome: null,
  advantage: null
};

// ─── FOUR ACTIONS OUTCOMES ───
const FA = {
  overcome: {
    nm:'Overcome', sh:'Get past an obstacle',
    out:[{l:'Fail',t:'Nope. Or succeed at a great cost.'},{l:'Tie',t:'Minor cost, or a lesser version.'},{l:'Succeed',t:'You get what you want.'},{l:'Style',t:'You get it and gain a boost.'}]
  },
  advantage: {
    nm:'Create Advantage', sh:'Create or discover an aspect, get free invokes',
    out:[{l:'Fail',t:'Nope. Or enemy gets a free invoke.'},{l:'Tie',t:'Existing aspect: 1 free invoke. New: boost instead.'},{l:'Succeed',t:'1 free invoke on the aspect.'},{l:'Style',t:'2 free invokes on the aspect.'}]
  },
  attack: {
    nm:'Attack', sh:'Harm someone, deal stress',
    out:[{l:'Fail',t:'No damage.'},{l:'Tie',t:'No damage, but you gain a boost.'},{l:'Succeed',t:'You deal damage. Shifts = stress dealt.'},{l:'Style',t:'Damage OR reduce by 1 and gain a boost.'}]
  },
  defend: {
    nm:'Defend', sh:'Stop something from happening to you',
    out:[{l:'Fail',t:"You don't defend."},{l:'Tie',t:'You defend, but enemy gains a boost.'},{l:'Succeed',t:'You defend successfully.'},{l:'Style',t:'You defend and gain a boost.'}]
  }
};

// ─── GUIDE CARDS ───
const GUIDE_CARDS = [
  {title:'The Golden Rules',                body:'<strong>Fiction first.</strong> Describe what you do, then figure out the mechanic.\n<strong>Aspects are always true.</strong> If you have "Strong as an Ox," you\'re strong whether you invoke it or not.\n<strong>You\'re not trying to win.</strong> You\'re trying to make interesting things happen. The best sessions come from dramatic complications, not flawless victories.'},
  {title:'Create Advantage Is Your Best Friend', body:'The most underused and most powerful action in Fate. It gives you <em>free invokes</em> — that\'s free +2s on future rolls, no FP cost.\n<strong>Stack advantages</strong> before a big move. Three free invokes from the team = +6 on the lead\'s roll.\nYou can create advantages on enemies, on the environment, on yourself. Get creative.'},
  {title:'Using Aspects Effectively',       body:'You can invoke <strong>before or after</strong> rolling. After is safer (you know if you need it). Before saves FP if you roll well.\nYou can invoke <strong>any</strong> aspect — yours, other characters\', scene aspects, consequences on enemies.\n<strong>Compels aren\'t punishments.</strong> They\'re the game paying you to make things interesting. Accept them for the FP and the story.'},
  {title:'Stress and Consequences',         body:'<strong>Stress is not health.</strong> It\'s plot armor. It goes away completely after the scene ends.\n<strong>Consequences are real injuries</strong> that stick around and can be invoked against you by opponents.\nYou <em>choose</em> how to absorb hits. A 4-shift hit could be: stress box 4, or box 2 + mild consequence, or moderate consequence alone.\n<strong>Conceding</strong> before you\'re taken out lets you choose your exit narrative and earn FP.'},
  {title:'Teamwork',                        body:'<strong>Highest skill leads</strong> the roll. Everyone else with +1 or more in the same skill adds +1.\nYou must <strong>describe how you help.</strong> "I help" is not enough — narrate it.\n<strong>Alternative:</strong> each helper uses Create Advantage on their turn and passes free invokes to the lead. Often more powerful than the +1.'},
  {title:'Ties and Partial Successes',      body:'A <strong>tie is not a failure.</strong> You succeed at a minor cost, or get a lesser version of what you wanted.\n<strong>Succeed with style</strong> (3+ shifts over) gives an extra bonus — a boost or additional free invokes.\nEven <strong>failure</strong> can become "succeed at serious cost" — the GM offers you a hard bargain. Say yes and deal with the fallout.'},
  {title:'The Ladder',                      body:'<b>+8</b> Legendary · <b>+7</b> Epic · <b>+6</b> Fantastic · <b>+5</b> Superb · <b>+4</b> Great · <b>+3</b> Good · <b>+2</b> Fair · <b>+1</b> Average · <b>+0</b> Mediocre · <b>-1</b> Poor · <b>-2</b> Terrible\n\nYour skill rating + dice roll vs opposition. Each step above the opposition = one shift.'}
];

// ─── CHARACTER ICONS (SVG) ───
const ICONS = {
  cap:    '<svg viewBox="0 0 44 44" fill="none"><path d="M22 6L30 18H14L22 6Z" stroke="#c49a38" stroke-width="1.5"/><path d="M22 14L30 26H14L22 14Z" stroke="#c49a38" stroke-width="1.5"/><line x1="18" y1="30" x2="26" y2="30" stroke="#c49a38" stroke-width="1.5"/><line x1="16" y1="33" x2="28" y2="33" stroke="#c49a38" stroke-width="1.5"/><line x1="14" y1="36" x2="30" y2="36" stroke="#c49a38" stroke-width="1.5"/></svg>',
  howard: '<svg viewBox="0 0 44 44" fill="none"><circle cx="14" cy="14" r="3" stroke="#4a9eb8" stroke-width="1.5"/><circle cx="30" cy="14" r="3" stroke="#4a9eb8" stroke-width="1.5"/><circle cx="22" cy="28" r="3" stroke="#7b4ac7" stroke-width="1.5"/><circle cx="14" cy="36" r="2" stroke="#4a9eb8" stroke-width="1.2"/><circle cx="30" cy="36" r="2" stroke="#4a9eb8" stroke-width="1.2"/><line x1="14" y1="17" x2="14" y2="34" stroke="#4a9eb8" stroke-width="1"/><line x1="30" y1="17" x2="30" y2="34" stroke="#4a9eb8" stroke-width="1"/><line x1="17" y1="14" x2="27" y2="14" stroke="#4a9eb8" stroke-width="1"/><line x1="16" y1="16" x2="20" y2="26" stroke="#4a9eb8" stroke-width="1"/><line x1="28" y1="16" x2="24" y2="26" stroke="#4a9eb8" stroke-width="1"/></svg>',
  thowra: '<svg viewBox="0 0 44 44" fill="none"><polygon points="22,8 27,14 27,22 22,26 17,22 17,14" stroke="#8a6ab8" stroke-width="1.3"/><polygon points="27,14 33,18 33,26 27,22" stroke="#8a6ab8" stroke-width="1" opacity=".5"/><polygon points="17,14 11,18 11,26 17,22" stroke="#8a6ab8" stroke-width="1" opacity=".5"/><polygon points="22,26 27,30 27,36 22,38 17,36 17,30" stroke="#8a6ab8" stroke-width="1" opacity=".35"/></svg>'
};

// ─── CHARACTERS ───
const CHARS = {

  cap: {
    id:'cap', name:'Montgomery "Cap" Sparks', displayName:'Cap Sparks',
    sub:'Rogue Ex-Space Marine', flavor:'They drew first blood.',
    refresh: 4,
    summary: {
      hc: 'Rogue Ex-Space Marine with a Tragic Past',
      trouble: 'Substance Abuse',
      playstyle: "You're the leader who shoots first and talks second. Your strongest assets are your physical dominance and combat awareness — nobody hits harder or survives more punishment. Your substance abuse and obsession with the Maltese Falcon will complicate things at the worst moments. The crew trusts you because you'd die for them.",
      topSkills: ['Physique +5 (Superb)','Survival +4 (Great)','Rapport +3 (Good)','Shoot +3 (Good)','Fight +3 (Good)'],
      moves: ["Cap shot first — +2 on opening attack","These aren't the droids — +2 to de-escalate","Do it now! — give your turn to an ally","Surprise utility belt — pull a mystery object"],
      watchOut: 'Substance Abuse compels at the worst moments. Revenge obsession pulls you off-mission. Fear of losing another crewmate can make you hesitate.',
      connections: "Bruce is dead — you blame yourself. Maltese Falcon calling card — the only clue to your wife's murder, always on you. The Misfits are your new family."
    },
    skills: {Physique:5,Athletics:2,Will:2,Rapport:3,Deceive:1,Provoke:1,Empathy:0,Contacts:2,Shoot:3,Fight:3,Survival:4,Burglary:0,Stealth:0,Investigate:0,Drive:1,Pilot:1,Navigate:1,Engineering:0,Medicine:0,Science:0,Culture:2},
    stress: {phys:{boxes:4,bonus:2}, ment:{boxes:3,bonus:1}},
    cons: [
      {id:'m1',  lbl:'Mild (2)',     abs:2, rec:'Fair (+2) · 1 scene',      src:'base',        val:null},
      {id:'m2',  lbl:'Mild (2)',     abs:2, rec:'Fair (+2) · 1 scene',      src:'Physique +5', val:null},
      {id:'mod', lbl:'Moderate (4)', abs:4, rec:'Great (+4) · 1 session',   src:'base',        val:'Laceration'},
      {id:'sev', lbl:'Severe (6)',   abs:6, rec:'Fantastic (+6) · 1 scenario', src:'base',     val:null}
    ],
    aspects: [
      {ty:'High Concept', nm:'Rogue Ex-Space Marine with a Tragic Past',
       inv:'Invoke when you need combat experience, tactical thinking, leadership under fire, or military discipline. Your past as a marine gives you an edge in any fight or command situation.',
       cmp:'Compel when the tragic past catches up — grief over Bruce, guilt about your wife, memories resurfacing, or someone recognizing the disgraced marine you used to be.'},
      {ty:'Trouble', nm:'Substance Abuse', inv:null,
       cmp:'Compel when substances are available and stress is high — impaired judgment, temptation at a critical moment, missed opportunities because you were out of it, or unwanted attention from your indulgence.'},
      {ty:'Aspect', nm:'Revenge is a cold mistress',
       inv:'Invoke for cold precision and relentless determination. When chasing leads on the Maltese Falcon, pushing through pain or exhaustion, or staring someone down who has answers you need.',
       cmp:'Compel when your obsession with revenge clouds your judgment — abandoning the mission for a lead, alienating allies by prioritizing the Falcon, or making reckless choices driven by vengeance.'},
      {ty:'Aspect', nm:"He ain't heavy, he's my bro",
       inv:"Invoke to channel Bruce's strength — raw physical determination, endurance beyond your limits, standing firm to protect someone you care about. Bruce would have held the line.",
       cmp:"Compel when the fear of losing someone again makes you hesitate, hold back from a risky plan, or push people away to avoid getting close enough to lose them."},
      {ty:'Aspect', nm:'They drew first blood',
       inv:'Invoke for devastating precision in combat, taking control of a chaotic fight, or intimidating enemies with your deadly expertise and unflinching presence.',
       cmp:'Compel when your combat instincts override good sense — escalating a situation that could be talked down, choosing violence over diplomacy, or responding to any provocation with force.'}
    ],
    stunts: [
      {id:'sf',  nm:'Cap shot first',                         sk:'Shoot',   fr:'1/scene',  tp:'attack',  sty:'default',
       desc:'+2 to first Shoot attack roll in a conflict.',
       when:'Use at the start of any firefight to set the tone. Best as your opening move when you want to hit hard before anyone reacts.',
       pairs:'Attack action. Combine with "They drew first blood" aspect for an even bigger opening.'},
      {id:'dr',  nm:"These aren't the droids you're looking for", sk:'Rapport', fr:'1/scene', tp:'overcome', sty:'default',
       desc:'+2 to de-escalate or end an armed conflict through negotiation.',
       when:"Use when a fight is going badly or isn't worth the cost. Works best after you've already shown you can fight — they're more willing to listen.",
       pairs:'Overcome action. Pairs well with "Rogue Ex-Space Marine" — your authority and presence back up your words.'},
      {id:'di',  nm:'Do it now!',                             sk:'Rapport', fr:'1/scene',  tp:'support', sty:'default',
       desc:'Give your turn to another character in the same scene.',
       when:"Use when another crew member has a better move available than you do. Especially powerful when Howard has a tech solution or Thowra has a social angle you can't match.",
       pairs:"Any action — you're enabling someone else's best move. Think of it as tactical command."}
    ],
    extras: [
      {id:'belt', nm:'Surprise utility belt / bandolier', sk:'Extra', fr:'1/session', tp:'wild', sty:'wild',
       desc:'Pull out a mystery useful object. Could save the day. Could be a bag of bags. GM decides.',
       when:'Save for moments when the situation seems impossible and you need a creative out. The GM determines what you find — it might be perfect or it might be absurd.',
       pairs:'Any situation. The belt is pure narrative — it produces whatever the story needs right now.'}
    ],
    corruption: null
  },

  howard: {
    id:'howard', name:'Howard "Clank"', displayName:'Howard "Clank"',
    sub:'Headstrong Maverick Bioengineer', flavor:'How does this work?',
    refresh: 4,
    summary: {
      hc: 'Terrai Headstrong Maverick Bioengineer',
      trouble: 'How does this work?',
      playstyle: "You're the smartest person in the room and you know it. You solve problems nobody else can touch — hacking, building, fixing, patching wounds. But you can't stop poking things that should be left alone. The Omega corruption is spreading through your bionic implants. Bonny is missing. Stay focused.",
      topSkills: ['Engineering +5 (Superb)','Will +4 (Great)','Burglary +3 (Good)','Stealth +3 (Good)','Medicine +3 (Good)'],
      moves: ["IT Hack — use Engineering as Burglary","Patch up — +2 to medical rolls","Monocle Beam — energy attack but marks corruption","Bonny — performs one action (currently missing)"],
      watchOut: 'Curiosity compels — you will touch, poke, and disassemble at the worst time. Mommy? makes you vulnerable to manipulation. The Omega Monocle is powerful but every use costs corruption.',
      connections: "Bonny the Mommy Bot — missing since the Tellar trek, you need to find her. Emanuelle recruited you — she reminded you of your mother. Your father pushed you into cybernetics and you rebelled by experimenting on yourself."
    },
    skills: {Physique:1,Athletics:2,Will:4,Rapport:0,Deceive:1,Provoke:1,Empathy:0,Contacts:1,Shoot:1,Fight:2,Survival:0,Burglary:3,Stealth:3,Investigate:2,Drive:0,Pilot:0,Navigate:0,Engineering:5,Medicine:3,Science:2,Culture:0},
    stress: {phys:{boxes:3,bonus:1}, ment:{boxes:4,bonus:2}},
    cons: [
      {id:'m1',  lbl:'Mild (2)',     abs:2, rec:'Fair (+2) · 1 scene',         src:'base', val:'Tired'},
      {id:'mod', lbl:'Moderate (4)', abs:4, rec:'Great (+4) · 1 session',      src:'base', val:null},
      {id:'sev', lbl:'Severe (6)',   abs:6, rec:'Fantastic (+6) · 1 scenario', src:'base', val:null}
    ],
    aspects: [
      {ty:'High Concept', nm:'Terrai Headstrong Maverick Bioengineer',
       inv:'Invoke for technical brilliance, rule-breaking solutions, and bionic-enhanced processing. When you need to hack, build, fix, or understand technology that nobody else can touch.',
       cmp:"Compel when your headstrong nature drives you to reckless experimentation — pushing boundaries that shouldn't be pushed, modifying things without thinking through consequences."},
      {ty:'Trouble', nm:'How does this work?', inv:null,
       cmp:'Compel when curiosity overrides caution — touching things that should be left alone, disassembling something critical to see how it works, or getting distracted by an interesting mechanism at the worst possible moment.'},
      {ty:'Aspect', nm:'Kicked from engineering school for unethical behaviour',
       inv:"Invoke for unconventional, outside-the-box solutions that proper engineers would never consider. Your disregard for rules is sometimes exactly what the problem needs.",
       cmp:"Compel when your tarnished reputation catches up — institutions don't trust you, officials treat you with suspicion, or past victims of your experiments reappear."},
      {ty:'Aspect', nm:'Mommy?',
       inv:'Invoke to draw comfort, stability, and focus from maternal figures or nurturing situations. Their presence grounds you and sharpens your thinking.',
       cmp:'Compel when you seek approval from mother-figures to the point of vulnerability — letting yourself be manipulated because someone makes you feel safe, or freezing up when that comfort is threatened.'},
      {ty:'Aspect', nm:'[Omega Element] Monocle',
       inv:"Invoke for enhanced perception, energy capabilities, and technological awareness beyond normal bionic limits. The Omega sees things you can't.",
       cmp:'Compel when the corruption creeps — the monocle acting on its own, unsettling people with your inhuman eye, tech malfunctions as the Omega asserts itself, or situations where the corruption makes you a liability.'}
    ],
    stunts: [
      {id:'ih', nm:'IT Hack',    sk:'Engineering', fr:'1/scene',       tp:'overcome', sty:'default',
       desc:'Use Engineering as Burglary to hack systems.',
       when:"Use when you need to get into a computer system, bypass digital security, or access locked data. Your engineering brain sees code the way a burglar sees locks.",
       pairs:"Overcome action. Pairs with \"Kicked from engineering school\" — your unethical methods are exactly what system security doesn't expect."},
      {id:'pu', nm:'Patch up',   sk:'Medicine',    fr:'1/scene',       tp:'support',  sty:'default',
       desc:'+2 bonus to medical rolls.',
       when:"Use when a crew member is hurt and needs field treatment. You're not a doctor, but you know enough about biology from your cybernetics work to patch people together.",
       pairs:'Overcome action (healing). Most useful for clearing mild consequences between scenes.'},
      {id:'mb', nm:'Monocle Beam', sk:'Engineering', fr:'+1 corruption', tp:'attack', sty:'danger', corr:true,
       desc:'Use Engineering as an energy attack AND +2 bonus to the roll. Marks 1 corruption.',
       when:'Use when you need to hit something hard and your Engineering is your best combat stat. Powerful but every use feeds the Omega. Save for moments that matter.',
       pairs:'Attack action. Your Engineering +5 plus the +2 bonus means rolling at +7 effective — devastating, but at a cost.'}
    ],
    extras: [
      {id:'bon', nm:'Bonny, Pint Sized Mommy Bot', sk:'Extra', fr:'1 fp', tp:'support', sty:'wild',
       desc:'Pint-sized AI assistant performs one appropriate action per session.',
       when:"Bonny can handle tasks you're too busy for — running a scan, fetching a tool, providing a distraction. Currently missing since the Tellar wilderness trek.",
       pairs:'Any situation where an extra pair of hands (or tiny robot arms) would help.'}
    ],
    corruption: {total:4, marked:[true,true,false,false]}
  },

  thowra: {
    id:'thowra', name:'Thowra Frostwhisper', displayName:'Thowra Frostwhisper',
    sub:'Looking for a Hive', flavor:'Out of spite.',
    refresh: 4,
    summary: {
      hc: 'Looking for a hive in all the wrong places',
      trouble: 'Trust Issues',
      playstyle: "You feel everything. Animals trust you instinctively, people less so. Your empathy is your greatest weapon and your biggest vulnerability — you read rooms better than anyone, but the alien instincts can overwhelm your judgment. You don't belong anywhere yet, but you'll fight like hell to protect what you've found. Out of pure spite if nothing else.",
      topSkills: ['Empathy +5 (Superb)','Shoot +4 (Great)','Will +4 (Great)','Deceive +3 (Good)','Provoke +3 (Good)'],
      moves: ['Pet Skycleaver — loyal flying predator companion','Stunts pending GM confirmation'],
      watchOut: "Trust Issues compels when allies ask for faith you can't give. Voice of the Wild can overwhelm you with primal instincts. Out of Spite escalates when backing down is smarter.",
      connections: "Found in a cryo-pod on Tellar — Cap and Howard rescued you. Your former comrades left you for dead. The Skycleaver is your most loyal companion. Fragmented memories of a military past are slowly resurfacing."
    },
    skills: {Physique:2,Athletics:2,Will:4,Rapport:0,Deceive:3,Provoke:3,Empathy:5,Contacts:0,Shoot:4,Fight:0,Survival:2,Burglary:0,Stealth:1,Investigate:1,Drive:0,Pilot:2,Navigate:0,Engineering:0,Medicine:1,Science:1,Culture:0},
    stress: {phys:{boxes:3,bonus:1}, ment:{boxes:4,bonus:2}},
    cons: [
      {id:'m1',  lbl:'Mild (2)',     abs:2, rec:'Fair (+2) · 1 scene',         src:'base', val:'Tired'},
      {id:'mod', lbl:'Moderate (4)', abs:4, rec:'Great (+4) · 1 session',      src:'base', val:'Grounded bear zap (healing)'},
      {id:'sev', lbl:'Severe (6)',   abs:6, rec:'Fantastic (+6) · 1 scenario', src:'base', val:null}
    ],
    aspects: [
      {ty:'High Concept', nm:'Looking for a hive in all the wrong places',
       inv:"Invoke for alien instincts, hive-mind connection, and desperate adaptability. When you need to sense something others can't, connect with creatures, or push through isolation with sheer determination.",
       cmp:"Compel when your need to belong leads you to the wrong people or places — misjudging loyalties, trusting a group that doesn't deserve it, or clinging to a sense of belonging that isn't real."},
      {ty:'Trouble', nm:'Trust issues', inv:null,
       cmp:"Compel when suspicion strains your alliances — refusing help that's genuinely offered, misreading good intentions as manipulation, pushing away crew members who are trying to connect, or withholding information that the team needs."},
      {ty:'Aspect', nm:'Voice of the wild (animal control)',
       inv:'Invoke to calm or command animals, sense danger through nearby wildlife, use creatures as allies or distractions, or navigate wilderness by reading animal behavior.',
       cmp:'Compel when primal instincts overwhelm your human judgment — acting on animal impulse, causing chaos through an uncontrolled animal connection, or prioritizing a creature\'s welfare over a crew member\'s.'},
      {ty:'Aspect', nm:'Out of spite',
       inv:'Invoke for sheer bloody-mindedness — refusing to quit when you should, defiant strength in the face of impossible odds, pushing through pain or exhaustion because giving up would mean they win.',
       cmp:"Compel when spite overrides good judgment — escalating a conflict because you refuse to back down, making a bad situation worse out of stubbornness, or taking unnecessary risks just to prove someone wrong."},
      {ty:'Aspect', nm:null, inv:null, cmp:null}
    ],
    stunts: [],
    extras: [
      {id:'sky', nm:'Pet Skycleaver', sk:'Extra', fr:'—', tp:'wild', sty:'wild',
       desc:'Tamed flying predator from the Tellar wilderness. Loyal companion.',
       when:'Your Skycleaver can scout, attack, create distractions, or intimidate. It acts on your command and is fiercely loyal.',
       pairs:'Works with Provoke (intimidation), Survival (scouting), or as a narrative advantage in any outdoor situation.'}
    ],
    corruption: null
  }

};
