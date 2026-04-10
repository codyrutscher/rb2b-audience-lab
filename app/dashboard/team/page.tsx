"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Users, Mail, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-auth";
import { formatDistanceToNow } from "date-fns";

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    const user = await getCurrentUser();
    if (user) {
      // Get actual workspace_id from user_workspaces
      const { data: uw } = await supabase
        .from('user_workspaces')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      const wsId = uw?.workspace_id || user.id;
      setWorkspaceId(wsId);

      // Load team members
      const { data: membersData } = await supabase
        .from('user_workspaces')
        .select('*')
        .eq('workspace_id', wsId);
      
      if (membersData) {
        setMembers(membersData);
      }

      // Load pending invitations
      const { data: invitationsData } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('workspace_id', wsId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (invitationsData) {
        setInvitations(invitationsData);
      }
    }
  }

  async function sendInvitation() {
    if (!email.trim()) return;
    setSending(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const res = await fetch("/api/reactivate/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail("");
        setRole("member");
        setInviteSuccess(true);
        setShowInviteForm(false);
        loadTeam();
      } else {
        setInviteError(data.error || "Failed to send invitation");
      }
    } catch (err: any) {
      setInviteError(err.message || "Network error");
    }
    setSending(false);
  }

  async function revokeInvitation(id: string) {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    
    loadTeam();
  }

  async function removeMember(userId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    await supabase
      .from('user_workspaces')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);
    
    loadTeam();
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
            <p className="text-gray-400">Invite team members and manage access</p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {inviteSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
            Invitation sent successfully{process.env.NEXT_PUBLIC_RESEND_CONFIGURED ? " — an email has been sent" : " — email sending requires Resend configuration"}.
          </div>
        )}

        {showInviteForm && (
          <div className="glass neon-border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Invite Team Member</h2>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {inviteError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:border-accent-primary focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white focus:border-accent-primary focus:outline-none transition"
                >
                  <option value="member">Member - Can view data</option>
                  <option value="admin">Admin - Can manage settings</option>
                  <option value="owner">Owner - Full access</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={sendInvitation}
                  disabled={sending || !email.trim()}
                  className="px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
                >
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  onClick={() => { setShowInviteForm(false); setInviteError(null); }}
                  className="px-4 py-2 bg-dark-tertiary hover:bg-dark-border text-gray-300 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="glass neon-border rounded-xl mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-border">
              <h2 className="text-xl font-semibold text-white">Pending Invitations</h2>
            </div>
            <div className="divide-y divide-dark-border">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Mail className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{invitation.email}</div>
                      <div className="text-sm text-gray-400">
                        Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })} · {invitation.role}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeInvitation(invitation.id)}
                    className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded transition"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="glass neon-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h2 className="text-xl font-semibold text-white">Team Members</h2>
          </div>
          <div className="divide-y divide-dark-border">
            {members.map((member) => (
              <div key={member.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-accent-primary/20 rounded-lg">
                    <UserCheck className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{member.email || member.user_id}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span className="capitalize">{member.role}</span>
                      <span>·</span>
                      <span>Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.user_id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No team members yet</h3>
                <p className="text-gray-400 mb-4">Invite your first team member to collaborate</p>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-lg hover:shadow-accent-primary/30 text-white rounded-lg transition-all font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Invite Member
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
