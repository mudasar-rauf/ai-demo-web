import { Text } from '@astryxdesign/core/Text';

export const NOT_BUILT_YET = 'Not built yet';

/** The placeholder a screen shows until its issue builds it. */
export function NotBuiltYet() {
  return <Text as="p">{NOT_BUILT_YET}</Text>;
}
