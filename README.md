# Marko Language

Adds syntax highlighting, autocompletion, hyperclick and tag matching to [Marko](https://github.com/marko-js/marko) files in Atom.

![Marko Syntax](https://raw.githubusercontent.com/marko-js/branding/master/marko-logo-small-white-bg.png)

Contributions are greatly appreciated. Please fork this repository and open a pull request to add snippets, make grammar tweaks, etc.

# Overview

Features overview:

- Syntax highlighting
- Tag matching
- Tag and attribute autocompletion
- Code snippets
- Hyperclick (clickable tags and attributes)
- Prettyprinting ([marko-prettyprint](https://github.com/marko-js/marko-prettyprint) is used internally)

# Installation

```
apm install language-marko
```

# Features

## Syntax highlighting

![Syntax highlighting](https://cloud.githubusercontent.com/assets/978214/18970226/ae1af1a2-864d-11e6-8aff-9112d0617cf8.png)

## Tag matching

![Tag matching](https://cloud.githubusercontent.com/assets/978214/18970220/ac407af0-864d-11e6-9458-e391cf9133e8.gif)

## Autocomplete

The package provides an [autocomplete-plus](https://github.com/atom/autocomplete-plus) provider that provides advanced tag and attribute autocompletions for [Marko templates](http://markojs.com/) in Atom.

This provider uses the Marko compiler to get an accurate list of available Marko custom tags and attributes for each template. In addition, this provider also provides full support for autocompleting standard HTML tags and attributes.

### Custom tags and attributes

![Custom tags and attributes](https://cloud.githubusercontent.com/assets/978214/15950041/b53dc384-2e68-11e6-8ff8-b5d873ab086f.gif)

### Snippets

![Snippets](https://cloud.githubusercontent.com/assets/978214/15950042/b7605104-2e68-11e6-82d0-dd69703a3c62.gif)

### Standard HTML tags and attributes

![Standard HTML tags and attributes](https://cloud.githubusercontent.com/assets/978214/15950048/bcd5f8dc-2e68-11e6-83b6-5ca64268eb16.gif)

### Concise and HTML syntax support

![Concise and HTML syntax support](https://cloud.githubusercontent.com/assets/978214/15950055/c3ca2398-2e68-11e6-9da5-6604eb173a34.gif)

### Marko Widgets

![Marko Widgets](https://cloud.githubusercontent.com/assets/978214/15950057/c82d5068-2e68-11e6-975c-07b24bb6ad0d.gif)

### Lasso.js

![Lasso.js](https://cloud.githubusercontent.com/assets/978214/15950058/cb396508-2e68-11e6-9d9f-25387936235f.gif)


## Hyperclick

The package provides a [hyperclick](https://github.com/facebooknuclideapm/hyperclick) provider that makes regions of [Marko templates](http://markojs.com/) clickable in Atom so that you can quickly jump to a custom tag implementation, an attribute definition, a file referenced by a path, an event handler method, etc.

## Clickable custom tags

![Clickable custom tags](https://cloud.githubusercontent.com/assets/978214/16811041/c373be0a-48e3-11e6-8eb1-72481086cab9.gif)

## Clickable custom attributes

![Clickable custom attributes](https://cloud.githubusercontent.com/assets/978214/16811042/c373e614-48e3-11e6-842f-0c6c9beafba7.gif)

## Clickable file paths

![Clickable file paths](https://cloud.githubusercontent.com/assets/978214/16811195/77a1da6a-48e4-11e6-871e-ef9cdc8261ce.gif)

## Clickable Marko Widgets event handler methods

![Clickable Marko Widgets event handler methods](https://cloud.githubusercontent.com/assets/978214/16811040/c3739830-48e3-11e6-981f-4cbc0133d6a2.gif)

## Prettyprint

![Prettyprint](https://cloud.githubusercontent.com/assets/978214/22164152/444024a4-df13-11e6-94cc-bb90123dcb0f.gif)

NOTE: Prettyprinting should be configured by adding `.marko-prettyprint` and/or `.editorconfig` files to your project. Please see: [marko-prettyprint - Configuration files](https://github.com/marko-js/marko-prettyprint#configuration-files)

# License

Licensed under the [MIT License](https://github.com/marko-js/atom-autocomplete-marko/blob/master/LICENSE)
