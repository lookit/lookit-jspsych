# Data

This package will do the following:

- Load data to be accessed while experiment is running.
- Move data to and from CHS's API.
- Move video content from the client computer to cloud storage.

## Load

When an experiment begins, some data will be loaded for use during the experiment. This function is called before an experiment is ran and doesn't need to be called again.

```javascript
await chsData.load(responseUuid);
```

Once this data has been loaded, it can be accessed on the `window` interface. The data should be structured as follows:

```javascript
window.chs = {
  study,
  child,
  pastSessions,
  response,
};
```

For example, child information can be accessed at `window.chs.child` and can be used within your experiment.
