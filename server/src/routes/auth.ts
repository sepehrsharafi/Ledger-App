import { Router } from 'express';

import { get } from '../db.js';
import { toTeamMember } from '../mappers.js';
import { badRequest, id, requireString } from '../util.js';

/**
 * Demo-only authentication: any non-empty credentials are accepted and the returned
 * token is not verified anywhere. Replace with a real identity provider before shipping.
 */
export const authRouter = Router();

authRouter.post('/sign-in', (req, res) => {
  const email = requireString(req.body?.email, 'Email', 200).toLowerCase();
  const password = requireString(req.body?.password, 'Password', 200);
  if (password.length < 1) throw badRequest('Password is required');

  const row = get('SELECT * FROM team_members WHERE lower(email) = ?', email);
  const member = row
    ? toTeamMember(row)
    : {
        id: id('tm'),
        name: email
          .split('@')[0]!
          .split(/[._-]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        email,
        role: 'Admin' as const,
        avatarColor: '#1F4BC5',
      };

  res.json({ token: `demo.${id('sess')}`, user: member });
});
