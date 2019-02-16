# CLI Commands

Here is a complete list of the commands availble through the **Mixt** command line tool.

To install the CLI tool, please run

```
npm install -g mixt
```

## Commands

### `mixt --help`
Prints a standard help output about the tool, listing the various options.

### `mixt [command] --help`
Prints the help page for a specific command.

### `mixt init` :

##### Description
Initializes a repository following **Mixt**'s structure. It calls `npm init` internally
for you.

##### Available options



### `mixt add <package>` :

Adds a new package to your sources. There again, it calls `npm init` from within
the new package's root directory.

### `mixt build` :

Builds all the packages from your `packages/sources` directory into the `packages/node_modules` directory.
If your package have a `build` script, it is executed first.
By default, `mixt build` tries to run the `build` script of your package, then copies the package into `node_modules`.

If your build process creates a separate folder containing a prebuilt package, you can add a `mixt` script
to your package, which will be executed after the `build` in place of the copy.


If you are using [@pika/pack](https://www.pikapkg.com/blog/introducing-pika-pack/), **Mixt** will handle it for
you out of the box by calling `pack build` with all the correct options. Don't forget to install `@pika/pack` as a 
dependency of your mono-repo!

### `mixt watch` :

This variant of `mixt build` builds your packages, and watches the filesystem for any change in your sources
to automatically rebuild the changed package. Use this in development to be able to test all your packages.

If your package has a `watch` script, **Mixt** calls it and defer the filesystem watching to it.

### `mixt clean` :

Cleans the `packages/node_modules` folder completely.

### `mixt resolve` :

This step, automatically called after `mixt build`, resolves for you all the dependencies of your packages
and updates the produced `package.json` accordingly. See [Dependency Handling](#dependency-handling) for more details about
the dependency system used by **Mixt**.

### `mixt status` :

List the packages that have changed since the last release. If you are using Git, a diff is made
against the latest tag. If not, then all packages are automatically marked as changed.

### `mixt publish` : 

The publish script handles the publishing process of your packages.
For each changed package (see `status` above), **Mixt** asks you for an increment of version (or a custom one), updates the source
`package.json`, runs your build script and publishes the updated packages using `npm publish`.

If your folder hosts a Git repository, tags are automatically created for each package with the newly used version.
 
### `mixt run <script>` : 

Check your source packages for a NPM script called `<script>`, and run it for each package where
it is found. 

### `mixt exec <command>` : 

Run the given shell command in all your source packages.
 
### Package-specific variants
For the following commands: `build`, `watch`, `resolve`, `publish`, `run` and `exec`, a package-specific variant
exists. To use it, simply add the name of the package(s) you want to run the command on
after the command.

For instance, to build only the module called `my-module`, you can do:

```
mixt build my-module
```

To run a NPM script on `module1` and `module2` specifically, run:

```
mixt run my-script module1 module2
```
