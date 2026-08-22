import { PrimaryButtonComponent } from './primary-button.component';

export default {
  title: 'Button/Primary',
  component: PrimaryButtonComponent,
};

export const Default = {
  args: { appearance: 'primary' },
};

export const Disabled = {
  args: { appearance: 'primary', disabled: true },
};
