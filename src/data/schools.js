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
