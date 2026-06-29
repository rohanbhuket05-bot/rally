export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

export function formatDate(dateISO, showTime) {
  if (!dateISO) return 'Date TBD';
  return showTime
    ? new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : new Date(dateISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export const CITIES = [
  'Atlanta, GA','Austin, TX','Baltimore, MD','Boston, MA','Charlotte, NC',
  'Chicago, IL','Cincinnati, OH','Cleveland, OH','Columbus, OH','Dallas, TX',
  'Denver, CO','Detroit, MI','El Paso, TX','Fort Worth, TX','Fresno, CA',
  'Houston, TX','Indianapolis, IN','Jacksonville, FL','Kansas City, MO','Las Vegas, NV',
  'Long Beach, CA','Los Angeles, CA','Louisville, KY','Memphis, TN','Mesa, AZ',
  'Miami, FL','Milwaukee, WI','Minneapolis, MN','Nashville, TN','New Orleans, LA',
  'New York, NY','Oakland, CA','Oklahoma City, OK','Omaha, NE','Philadelphia, PA',
  'Phoenix, AZ','Portland, OR','Raleigh, NC','Sacramento, CA','San Antonio, TX',
  'San Diego, CA','San Francisco, CA','San Jose, CA','Seattle, WA','Tampa, FL',
  'Tucson, AZ','Tulsa, OK','Virginia Beach, VA','Washington, DC',
  'London, UK','Paris, France','Tokyo, Japan','Sydney, Australia','Toronto, Canada',
  'Vancouver, Canada','Mexico City, Mexico','Berlin, Germany','Amsterdam, Netherlands',
  'Barcelona, Spain','Madrid, Spain','Rome, Italy','Dubai, UAE','Singapore',
  'Seoul, South Korea','Mumbai, India','Bangkok, Thailand','Hong Kong',
];
