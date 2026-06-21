import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home page header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Home/i);
  expect(headerElement).toBeInTheDocument();
});
