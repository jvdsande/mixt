# Mixt - Mono-repo manager

A simple packager for handling your mono-repo of Node packages.

**Mixt** allows you to handle your mono-repo with close to no boilerplate, 
and without worrying about extra steps.

Its organisation and functioning is based off the *Alle* process described
here: [https://github.com/boennemann/alle](https://github.com/boennemann/alle)

## Project structure

A **Mixt** project follows a very simple project structure. At the root,
it looks like any other NPM package, with a `package.json` file and a `node_modules` folder.

We then add a `packages` folder which will be holding our actual packages.

In this folder, we find a `sources` folder containing the working copy of our
packages, along a second `node_modules` folder which is handled directly by
**Mixt**.

While using **Mixt**, you only ever have to worry about what's inside the 
`sources` folder: that's all you. For the rest, let us take care of it.


Your project structure should look like this:

```
mixt-project/
    node_modules/
    packages/   
        node_modules/
        sources/        <-- Your packages go here
    package.json
```


## Command Line Tool

**Mixt** offers a CLI utility that takes care of most common tasks about package
handling: initializing the mono-repo, creating a new package, building, publishing...
Everything is exposed through the `mixt` command.

You can install the command by running:

```
npm install -g mixt
```

From there, you obtain access to the following commands:

### `mixt init` :

Initializes a repository following **Mixt**'s structure. It calls `npm init` internally
for you.

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

### `mixt resolve` :

This step, automatically called after `mixt build`, resolves for you all the dependencies of your packages
and updates the produced `package.json` accordingly. See [Dependency Handling](#dependency-handling) for more details about
the dependency system used by **Mixt**.

### `mixt publish` : (WIP)

The publish script (work in progress, not yet available) handles the publishing process of your packages.
For each package, **Mixt** asks you for an increment of version (or a custom one), updates the source
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
 
 
## Dependency Handling <a name="dependency-handling"></a>

The dependency system is based on the work done in the *Alle* process. As the build
directory is called `node_modules`, it is automatically picked up by Node's require algorithm.

Any package in a subdirectory of `packages` will be able to access the built packages in `node_modules`
just as if they had been installed by `npm`.

#### External dependency for a package
If one of your packages needs an external dependency, just go ahead and install it inside your package sources,
just like you would do in a normal setup.

#### External dependency shared by multiple packages
If your dependency is shared by multiple local packages (it does not need to be used by *all* of them, just a few), then
you should instead add it to the root's `package.json`. It will still be available from within your packages, again relying
on the require algorithm which looks in parents' `node_modules`.

This way, you can make sure that all of your packages always use the same version of your shared dependency.

#### Dependency to a local package
If one of your local packages needs to import another one, just go ahead and require it in your code:
it is already accessible, as it is built in a `node_modules` folder.

### The *resolve* step
While the above setup works great locally inside the mono-repo, it does not allow you to publish your
packages as-is: they will be missing dependency definitions in their `package.json` files, as some will be
instead in the root `package.json` file (common dependency), and other will not be specified at all (local packages).

The `mixt resolve` command makes sure that the built `package.json` is fully up-to-date by checking your code
for any package required, and then resolving it either from your `package.json`, the root `package.json`, or the
`packages/node_modules` folder.

### Using a specific version
If you don't want the *resolve* step to decide by itself the version of a common dependency or local package,
simply add an entry manually to the package's `package.json`: it always takes precedence over the common and 
local dependencies.
