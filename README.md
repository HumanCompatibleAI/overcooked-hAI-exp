# Overcooked Human-AI Experiment Demo

## How to run psiturk app locally

- Set up a virtual environment with [psiturk](https://psiturk.org/)
(python 2.7).
- Go into the main folder and run `psiturk`.
- Start the server, `server on`
- Start a debug session, `debug`.

## Running on Heroku
See [here](https://psiturk.readthedocs.io/en/latest/heroku.html)

## To build the experiment application (an npm app)
Make sure that the overcooked-js package is linked as `overcooked`.

Go to `static/js/task/` and run:

```
npm install
npm link overcooked
npm run build
```