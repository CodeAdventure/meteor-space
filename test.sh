# !/usr/bin/env bash

if [ "$TEST_DRIVER" ];
then
  TEST_DRIVER=$TEST_DRIVER
else
  TEST_DRIVER="practicalmeteor:mocha"
fi

if [ "$METEOR_PACKAGE_DIRS" ];
then
  PACKAGE_DIRS=$METEOR_PACKAGE_DIRS
else
  if [ "$PACKAGE_DIRS" ];
  then
      PACKAGE_DIRS=$PACKAGE_DIRS
  else
      PACKAGE_DIRS="packages"
  fi
fi

export METEOR_PACKAGE_DIRS=$PACKAGE_DIRS

eval "meteor test-packages ./ --driver-package $TEST_DRIVER $*"