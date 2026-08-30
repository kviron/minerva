import { defineEventHandler, toWebRequest } from 'h3'
import { getAuth } from '../../../../modules/identity/auth/get-auth'
import { createOAuthAuthorizationServerMetadataHandler } from '../../../../modules/identity/auth/oauth-metadata'

export default defineEventHandler(event =>
  createOAuthAuthorizationServerMetadataHandler(getAuth())(toWebRequest(event)),
)
