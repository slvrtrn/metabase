import React from "react";

const dictionary = [["fr", "dashboard_name", "dashboard", "tableau de bord"]];

const originalCreateElement = React.createElement;

// There are a few methods we can use.
//
// Process props automatically. There is a mapping of friendly names to
// component/prop tuples, e.g. "Dashboard name", "HeaderCaption>initialValue".
// The translation spreadsheet maps locales, strings, and (optional) friendly
// names (which serve as context) to msgstrs. If a component's prop's value has
// a translation (for the current locale) mentioned in this spreadsheet then we
// translate it when creating the component.
//
// Translate right when the data arrives from the endpoint, so that
// dashboard.name is always translated. Downside: there might be occasions
// where you want the original column name to be available, like if you are
// showing the columns that can be used for writing SQL. Typically we want
// these translations to show up only when the user reading/viewing data, not
// when the user is writing queries. We could have the translation available as
// dashboard.local_name or dashboard.name_local and then just in those places
// where we explicitly want the localized string to appear we can use this
// alternative. If we take this approach we could also do the translation in
// the BE. This would allow us to avoid sending the whole dictionary over the
// wire.

/**
 * We override createElement so that props can be automatically translated
 */
function createElement(type: any, props: any, ...children: any[]) {
  if (typeof type === "string") {
    // Skip translation for native HTML elements
    return originalCreateElement(type, props, ...children);
  }

  const componentName = type.displayName || type.name;

  if (!componentName) {
    // Skip translation for components without a name
    return originalCreateElement(type, props, ...children);
  }

  const translatedProps = Object.entries(props || {}).reduce(
    (acc, [key, value]) => {
      if (typeof value === "string") {
        const translation = translations.find(
          ([name, prop, lang]) =>
            name === componentName && prop === key && lang === "fr",
        );
        const msgstr = translation[4];
        acc[key] = msgstr || value;
      } else {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return originalCreateElement(type, translatedProps, ...children);
}

React.createElement = createElement;
