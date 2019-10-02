# Overcooked Human-AI Experiment Demo

## To build the experiment application (an npm app)
Make sure that the overcooked-js package is linked as `overcooked`.

Go to `static/js/task/` and run:

```
npm install
npm link overcooked
npm run build
```

## How to run psiturk app locally
- Set up a virtual environment with [psiturk](https://psiturk.org/)
(python 2.7). E.g., with anaconda, run
```
conda create -n psiturk_test_env python=2.7.14
source activate psiturk_test_env
pip install psiturk
```
- Go into the main folder and run `psiturk`.
- Start the server, `server on`
- Start a debug session, `debug`.

For additional information see the psiturk website.

## Hosting the experiments for MTurk

Refer to the instructions on the psiturk website.

An easy way to host the experiments for MTurk is by using an EC2 instance. Make sure you set it up following [these instructions](https://psiturk.readthedocs.io/en/latest/amazon_ec2.html).


