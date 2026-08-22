import { PrimaryButton } from './PrimaryButton';

export default { title: 'Button/Primary', component: PrimaryButton };

export const Default = { args: { appearance: 'primary' } };
export const Disabled = { args: { appearance: 'primary', disabled: true } };
