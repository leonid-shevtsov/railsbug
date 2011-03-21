# RailsBug - debug Rails apps from Firebug!

**WARNING** this is alpha stuff! Bugs and feature requests are welcome.

**TODO** extension

## Installation

First, you'll need to set up `rack-bug` from [my branch](https://github.com/leonid-shevtsov/rack-bug). It is patched to provide data for this extension.
Follow the README there, it's nothing special.

Then, you install this extension into Firefox and off you go!

## Credit where credit is due

Two things that made this extension much simpler to code:

* `rack-bug`, a Rails debugging toolbar - i used it for the backend as it has a great structure for such a tool.
* John Resig's Javascript microtemplating microframework - DOMplate is *such* a mess.

## TODO

* refactor code into multiple classes/files
* make JS templates precompilable
* employ Sass to make CSS easier
* automate build process with Rake

(c) 2011 Leonid Shevtsov.
