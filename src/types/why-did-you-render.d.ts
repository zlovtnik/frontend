/**
 * Type declarations for optional why-did-you-render package
 * This is an ambient module declaration that doesn't require the package to be installed
 */
declare module 'why-did-you-render' {
  interface WhyDidYouRenderOptions {
    trackAllPureComponents?: boolean;
    trackHooks?: {
      useContext?: boolean;
      useState?: boolean;
      useReducer?: boolean;
      useMemo?: boolean;
      useCallback?: boolean;
    };
    trackExtraHooks?: Array<[unknown, string]>;
    logOwnerReasons?: boolean;
    collapseGroups?: boolean;
    groupByComponent?: boolean;
    include?: RegExp[];
    exclude?: RegExp[];
    notifier?: (options: unknown) => void;
  }

  function whyDidYouRender(
    react: typeof import('react'),
    options?: WhyDidYouRenderOptions
  ): void;

  export default whyDidYouRender;
}
