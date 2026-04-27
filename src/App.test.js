import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
  localStorage.clear();
});

test('renders the game landing screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: /сапёр/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /новичок/i })).toBeInTheDocument();
});

test('navigates to the rules page without showing the game UI', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('link', { name: 'Правила' }));

  expect(
    screen.getByRole('heading', { level: 1, name: /правила сапёра/i })
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /новичок/i })).not.toBeInTheDocument();
});

test('starts a safe beginner game', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: /новичок/i }));
  await userEvent.click(screen.getAllByRole('button', { name: /строка/i })[0]);

  expect(await screen.findByText(/секунд/i)).toBeInTheDocument();
  expect(screen.queryByText(/мина/i)).not.toBeInTheDocument();
});
