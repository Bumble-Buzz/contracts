# contracts
EVM smart contracts

# create .npmrc file
```
cat << EOF > .npmrc
@reach-now:registry=${CODEARTIFACT_REPOSITORY}
${CODEARTIFACT_REPOSITORY#https:}:always-auth=true
${CODEARTIFACT_REPOSITORY#https:}:_authToken=${CODEARTIFACT_AUTH_TOKEN}
EOF
```
