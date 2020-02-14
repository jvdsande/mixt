# CLI Commands

Here is a complete list of commands available through the **Mixt** command line tool.

To install the CLI tool, please run

```
npm install -g @mixt/core
```

*Note: if you had been using the previous **Mixt** version from the `mixt` package, make sure to run `npm rm -g mixt` before installing `@mixt/core`*

## General commands

### ```mixt --help, mixt -h``` :

Prints a standard help output about the tool, listing the various options

### ```mixt [command] --help, mixt [command] -h``` :

Prints the help page for a specific command

### ```mixt --version, mixt -V```

Prints the currently installed version number

## Monorepo Management commands:

**Mixt** provides a set of CLI commands for managing your monorepo.

### `mixt init` :

##### Description

Initializes a repository following **Mixt**'s structure. It calls `npm init` internally
for you.

##### Available options
  `-c, --config <config>` :             How to generate config file. "true" generates a "mixt.json" file. "embed" adds the config to "package.json". "false" does not store configuration. (default: true)

  `-s, --sources <sources>` :           Comma-separated list of source folders. Will be added to configuration.
  
  `-r, --resolve <resolve>` :           Resolve method to use from full|cheap|all|none. Defaults to full. Will be saved to configuration. Values are :
* `"full"` : check inside source files to extract all used dependencies. Most robust, but can be long on big projects.
* `"cheap"` : only add dependencies referred to in the module's `package.json`. The wildcard `"*"` can be used as version to fetch the root's `package.json` dependency.
* `"all"` : add all dependencies from the root's `package.json`.
* `"none"` : keep the local `package.json` as-is


  `-p, --prefix <prefix>` :             Prefix for preferred npm scripts. Defaults to `"mixt:"`. Will be saved to configuration.

  `-b, --git-branch <branch>` :         Specify the Git branch from which publishing is allowed. Defaults to "master". Will be saved to configuration.

  `-t, --git-tag-prefix <tagPrefix>` :  Append a custom prefix for generated Git tags. Defaults to none. Will be saved to configuration.

### `mixt add [source] <package>` :

##### Description
Adds a new package to your sources. There again, it calls `npm init` from within
the new package's root directory.

If the source parameter is omitted, the package will be added to the first source folder configured.

##### Available options
  `-r, --resolve <resolve>` :  Resolve method to use from full|cheap|all|none. Defaults to full. Will be added to local config.

  `-p, --prefix <prefix>` :    Prefix for preferred npm scripts. Defaults to `"mixt:"`. Will be added to local config.

  `-d, --dist <dist>` :        Subdirectory holding the built package. Defaults to `"./"`. Will be added to local config.


### `mixt list` :

##### Description
List all packages handled by **Mixt** and display basic information about them

##### Available options
  `-s, --sources <sources>`:  Comma-separated list of source folders. Will only list packages in those sources.

### `mixt hoist [packages...]` :

##### Description
Get all **Mixt**-managed packages and add them to the root's `package.json` as `file:` dependency

If you specify a list of packages names as variadic argument, only those packages will be hoisted.

##### Available options
  `-s, --sources <sources>`:  Comma-separated list of source folders. Will only hoist packages in those sources.

### Cross-packages script handling commands:

**Mixt** makes it easy to run commands in one or multiple managed packages.

### `mixt run <script> [packages...]` :

##### Description
Go through all managed packages (or packages given to the command), and execute the given NPM script if found.

All packages are checked sequentially, so only one script ever runs at a time.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

  `-q, --quiet` :              Turn off logging for scripts


### `mixt exec <command> [packages...]` :

##### Description
Behaves just like `mixt run`, but takes a bash command to run in each packages instead of an NPM script name.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

  `-q, --quiet` :              Turn off logging for scripts

#### Shorthands commands:

### `mixt build [packages...]` :

##### Description
Shorthand for `mixt run build`. Will also match `mixt:build` scripts.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

  `-q, --quiet` :              Turn off logging for scripts
  
### `mixt watch [packages...]` :

##### Description
Shorthand for `mixt run watch`. Will also match `mixt:watch`, `mixt:dev` and `dev` scripts.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

  `-q, --quiet` :              Turn off logging for scripts

### `mixt test [packages...]` :

##### Description
Shorthand for `mixt run test`. Will also match `mixt:test` scripts.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

  `-q, --quiet` :              Turn off logging for scripts
  
### Release related commands:

### `mixt status [packages...]` :

##### Description

Check against the latest Git tag to see which packages have been modified since. If no tag is found, all packages are
marked as changed by default.

##### Available options
  `-s, --sources <sources>` :  Comma-separated list of source folders. Will limit scope to those sources

### `mixt release [packages...]` :

##### Description
Helper command for gracefully handling your package releases. It provides a CLI workflow for bumping your packages versions,
optionally builds your packages before release, etc... Here is the complete **Mixt** release flow :
 - **Check repository:** only allow releases from the configured branch
 - **Get modified packages:** find packages in need of a new release
 - **Bump packages versions:** ask you for the next version of each packages
 - **Build packages (optional):** build all packages before releasing
 - **Resolve dependencies:** inject all root dependency to the local `package.json`, injecting the correct version for local packages
 - **Execute release script:** look for a `mixt:release` or `release` script in each package and execute it
 - **Commit releases (optional):** create a release commit with all released packages names and versions
 - **Create tags (optional):** create a Git tag for each released package
 - **Revert dependency resolve:** revert your local `package.json` to their original state (except version)
 - **Commit revert (optional):** commit again to store the revert of local dependency
 
That is quite a lot, but it is what is most often needed for any releases. Here all is taken care of for you in one simple command.

##### Available options
  `-s, --sources <sources>` :           Comma-separated list of source folders. Will only release packages inside those sources
  
  `-a, --all` :                         Whether to release packages that have not changed on Git
  
  `-r, --resolve <resolve>` :           Resolve method to use from full|cheap|all|none. Defaults to full
  
  `-B, --no-build` :                    Do not build packages before releasing (not recommended)
  
  `-T, --no-tag` :                      Do not add Git tag after releasing
  
  `-C, --no-commit` :                   Do not commit release to Git, only run scripts. Automatically adds "no-tag" flag
  
  `-t, --git-tag-prefix <tagPrefix>` :  Append a custom prefix for generated Git tags. Defaults to none
  
  `-b, --git-branch <branch>` :         Specify the Git branch from which publishing is allowed. Defaults to "master"
  
  `-q, --quiet` :                       Turn off logging for scripts
