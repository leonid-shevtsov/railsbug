**This project is discontinued.** I'm just not using Firefox, so I have no interest in working on it.

You may fork the code and fix it. Or, [rails_panel](https://github.com/dejan/rails_panel) is a good alternative for Google Chrome.

This codebase is useful as an illustration that Firebug addon development is not much fun. :)

# RailsBug - debug Rails apps from Firebug!

Installable via [RailsBug @ Firefox Addons](https://addons.mozilla.org/en-US/firefox/addon/railsbug/).

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
