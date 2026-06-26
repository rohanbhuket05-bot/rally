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
  'ucsd.edu':      'UCSD',
  'usc.edu':       'USC',
  'ucla.edu':      'UCLA',
  'berkeley.edu':  'UC Berkeley',
  'uci.edu':       'UC Irvine',
  'ucsb.edu':      'UCSB',
  'ucdavis.edu':   'UC Davis',
  'ucsc.edu':      'UC Santa Cruz',
  'ucr.edu':       'UC Riverside',
  'sdsu.edu':      'SDSU',
  'stanford.edu':  'Stanford',
  'mit.edu':       'MIT',
  'harvard.edu':   'Harvard',
  'yale.edu':      'Yale',
  'princeton.edu': 'Princeton',
  'columbia.edu':  'Columbia',
  'cornell.edu':   'Cornell',
  'nyu.edu':       'NYU',
  'uchicago.edu':  'UChicago',
  'cmu.edu':       'CMU',
  'gatech.edu':    'Georgia Tech',
  'umich.edu':     'U of Michigan',
  'utexas.edu':    'UT Austin',
  'uw.edu':        'UW',
  'purdue.edu':    'Purdue',
  'ufl.edu':       'UF',
  'csusm.edu':     'CSUSM',
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
