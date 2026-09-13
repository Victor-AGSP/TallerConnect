/**
 * Compatibility entry point for the button used by the existing screens.
 * The implementation lives in `components/common` so new screens can use
 * the same reusable component directly.
 */
export {
  Button as AppButton,
} from '@/components/common/Button';

export type {
  ButtonProps as AppButtonProps,
  ButtonVariant as AppButtonVariant,
} from '@/components/common/Button';
