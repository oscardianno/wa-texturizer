import React from "react";
import _ from "lodash";

export function useDebouncedEffect(
  callback: React.EffectCallback,
  dependency: Array<any>,
  timeout = 2000,
  options = { trailing: true, leading: false }
) {
  const { leading, trailing } = options;
  // The source of truth will always be _dependencyRef.current
  const [_dependency, _setDependency] = React.useState(dependency);

  const debouncedDependencyChangeHandler = React.useMemo(
    () =>
      _.debounce(
        (dependency) => {
          _setDependency(dependency);
        },
        timeout,
        { trailing, leading }
      ),
    [trailing, leading, timeout]
  );

  React.useEffect(() => {
    if (dependency) {
      debouncedDependencyChangeHandler(dependency);
    }
  }, dependency);

  React.useEffect(callback, _dependency);
}
