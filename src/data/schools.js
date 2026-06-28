export const SCHOOLS = [
  'UCSD', 'USC', 'UCLA', 'UC Berkeley', 'UC Irvine', 'UCSB', 'UC Davis',
  'UC Santa Cruz', 'UC Riverside', 'SDSU', 'Stanford', 'MIT', 'Harvard',
  'Yale', 'Princeton', 'Columbia', 'Cornell', 'NYU', 'UChicago', 'CMU',
  'Georgia Tech', 'U of Michigan', 'UT Austin', 'UW', 'Purdue', 'UF', 'CSUSM',
  'Penn State', 'Ohio State', 'UNC Chapel Hill', 'Duke', 'Vanderbilt',
  'Northwestern', 'Georgetown', 'Boston University', 'Northeastern',
  'UC Merced', 'Cal Poly SLO', 'Cal Poly Pomona', 'SFSU', 'CSULB', 'CSUF',
  'Arizona State', 'U of Arizona', 'U of Colorado Boulder', 'CU Denver',
  'Florida State', 'U of Florida', 'U of Miami', 'U of Georgia', 'Emory',
  'U of Virginia', 'Virginia Tech', 'U of Washington', 'Washington State',
  'U of Oregon', 'Oregon State', 'U of Utah', 'BYU', 'U of Nevada Las Vegas',
  'Indiana University', 'U of Illinois', 'U of Wisconsin', 'U of Minnesota',
  'Michigan State', 'Penn', 'Brown', 'Dartmouth', 'Rice', 'Tufts', 'Wake Forest',
  'Tulane', 'TCU', 'SMU', 'Baylor', 'Texas A&M', 'U of Houston',
];

const EDU_DOMAINS = {
  // UC System
  'ucsd.edu':       'UCSD',
  'usc.edu':        'USC',
  'ucla.edu':       'UCLA',
  'berkeley.edu':   'UC Berkeley',
  'uci.edu':        'UC Irvine',
  'ucsb.edu':       'UCSB',
  'ucdavis.edu':    'UC Davis',
  'ucsc.edu':       'UC Santa Cruz',
  'ucr.edu':        'UC Riverside',
  'ucmerced.edu':   'UC Merced',
  // CA State / CSU
  'sdsu.edu':       'SDSU',
  'csusm.edu':      'CSUSM',
  'calpoly.edu':    'Cal Poly SLO',
  'cpp.edu':        'Cal Poly Pomona',
  'sfsu.edu':       'SFSU',
  'csulb.edu':      'CSULB',
  'fullerton.edu':  'CSUF',
  // Ivies + elite privates
  'stanford.edu':   'Stanford',
  'mit.edu':        'MIT',
  'harvard.edu':    'Harvard',
  'yale.edu':       'Yale',
  'princeton.edu':  'Princeton',
  'columbia.edu':   'Columbia',
  'cornell.edu':    'Cornell',
  'upenn.edu':      'Penn',
  'brown.edu':      'Brown',
  'dartmouth.edu':  'Dartmouth',
  // NYC
  'nyu.edu':        'NYU',
  // Chicago area
  'uchicago.edu':   'UChicago',
  'northwestern.edu': 'Northwestern',
  // Tech schools
  'cmu.edu':        'CMU',
  'gatech.edu':     'Georgia Tech',
  // Big Ten + majors
  'umich.edu':      'U of Michigan',
  'msu.edu':        'Michigan State',
  'utexas.edu':     'UT Austin',
  'uw.edu':         'UW',
  'purdue.edu':     'Purdue',
  'ufl.edu':        'UF',
  'psu.edu':        'Penn State',
  'osu.edu':        'Ohio State',
  'unc.edu':        'UNC Chapel Hill',
  'illinois.edu':   'U of Illinois',
  'wisc.edu':       'U of Wisconsin',
  'umn.edu':        'U of Minnesota',
  'indiana.edu':    'Indiana University',
  // Southeast
  'duke.edu':       'Duke',
  'vanderbilt.edu': 'Vanderbilt',
  'georgetown.edu': 'Georgetown',
  'emory.edu':      'Emory',
  'uga.edu':        'U of Georgia',
  'fsu.edu':        'Florida State',
  'miami.edu':      'U of Miami',
  'tulane.edu':     'Tulane',
  // Northeast
  'bu.edu':         'Boston University',
  'northeastern.edu': 'Northeastern',
  'tufts.edu':      'Tufts',
  'wfu.edu':        'Wake Forest',
  'rice.edu':       'Rice',
  // Mid-Atlantic
  'virginia.edu':   'U of Virginia',
  'vt.edu':         'Virginia Tech',
  // Pacific Northwest
  'uoregon.edu':    'U of Oregon',
  'oregonstate.edu': 'Oregon State',
  'wsu.edu':        'Washington State',
  // Mountain West
  'colorado.edu':   'U of Colorado Boulder',
  'ucdenver.edu':   'CU Denver',
  'utah.edu':       'U of Utah',
  'byu.edu':        'BYU',
  'unlv.edu':       'U of Nevada Las Vegas',
  'arizona.edu':    'U of Arizona',
  'asu.edu':        'Arizona State',
  // Texas
  'tamu.edu':       'Texas A&M',
  'tcu.edu':        'TCU',
  'smu.edu':        'SMU',
  'baylor.edu':     'Baylor',
  'uh.edu':         'U of Houston',
};

export function getSchoolFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1];
  if (!domain.endsWith('.edu')) return null;
  return EDU_DOMAINS[domain] || null;
}

export function getSchoolFromDomain(domain) {
  if (!domain) return null;
  return EDU_DOMAINS[domain.toLowerCase()] || null;
}

/** Returns all .edu domains expected for a given school name. */
export function getDomainsForSchool(school) {
  if (!school) return [];
  return Object.entries(EDU_DOMAINS)
    .filter(([, s]) => s === school)
    .map(([domain]) => domain);
}
