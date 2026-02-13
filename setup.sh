#!/bin/bash
# Wrapper para ejecutar setup.py desde la raíz del proyecto
exec python ./skills/setup.py "$@"
