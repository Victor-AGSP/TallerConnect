import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('testing environment', () => {
  it('renders React Native components with RNTL', async () => {
    const { getByText } = await render(<Text>Testing works</Text>);

    expect(getByText('Testing works')).toBeTruthy();
  });
});
